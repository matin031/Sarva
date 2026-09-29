"use server";

import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { tehranDay, tehranDayAvailable } from "@/lib/analytics/timezone";
import { tehranDayKey } from "@/lib/panel/day-counts";
import { maintenanceState } from "@/lib/site/maintenance";
import { mailAdapter } from "@/lib/mail";
import { smsStatus } from "@/lib/sms";

/**
 * نماهای کلیِ پنل: روندِ روزانهٔ داشبورد، سلامتِ سیستم، و نشان‌های منو.
 *
 * هر تابع `requireAdmin()` خودش را دارد — همان قاعدهٔ بقیهٔ `lib/admin`.
 */

// ---------------------------------------------------------------------------
// روندِ روزانه
// ---------------------------------------------------------------------------

export type TrendDay = {
  /** کلیدِ روزِ تهران، `YYYY-MM-DD`. */
  day: string;
  /** برچسبِ شمسیِ کوتاه — «۵ مهر». */
  label: string;
  signups: number;
  attempts: number;
  /** فروشِ آن روز به ریال. */
  revenueRials: number;
  orders: number;
};

export type DailyTrends =
  | { state: "ok"; days: TrendDay[] }
  /** جدول‌های منطقهٔ زمانیِ MySQL بارگذاری نشده‌اند — چرایی در `lib/analytics/timezone.ts`. */
  | { state: "unavailable" };

const TREND_DAYS = 30;

/**
 * سی روزِ گذشته، روزبه‌روز به وقتِ تهران.
 *
 * ⚠️ اگر `CONVERT_TZ` نامِ منطقه را نشناسد، هر گروه‌بندی NULL می‌شود و
 * نمودار *صفر* نشان می‌دهد — یک گزارشِ غلط که شبیهِ یک گزارشِ درست است.
 * پس پیش از هر کوئری سنجیده می‌شود و در آن حالت صریحاً «در دسترس نیست»
 * برمی‌گردد.
 */
export async function adminDailyTrends(): Promise<DailyTrends> {
  await requireAdmin();
  if (!(await tehranDayAvailable())) return { state: "unavailable" };

  // ⚠️ یک روزِ اضافه در شرط: مرزِ «سی روزِ تهران» با «سی روزِ UTC» تا سه
  // ساعت و نیم فرق دارد. ردیف‌های اضافه در JS بیرون می‌افتند چون روزشان
  // در فهرستِ پایین نیست.
  const windowDays = [TREND_DAYS + 1];

  const [signups, quiz, exams, sales] = await Promise.all([
    query<{ day: string; n: number }>(
      `select ${tehranDay("created_at")} as day, count(*) as n
         from users
        where created_at > now(6) - interval ? day
        group by day`,
      windowDays,
    ),
    query<{ day: string; n: number }>(
      `select ${tehranDay("created_at")} as day, count(*) as n
         from quiz_attempts
        where created_at > now(6) - interval ? day
        group by day`,
      windowDays,
    ),
    query<{ day: string; n: number }>(
      `select ${tehranDay("created_at")} as day, count(*) as n
         from exam_attempts
        where created_at > now(6) - interval ? day
        group by day`,
      windowDays,
    ),
    query<{ day: string; n: number; rials: number | string }>(
      `select ${tehranDay("paid_at")} as day, count(*) as n, coalesce(sum(amount_rials), 0) as rials
         from plus_orders
        where status = 'paid' and paid_at > now(6) - interval ? day
        group by day`,
      windowDays,
    ),
  ]);

  const toMap = <T extends { day: string }>(rows: T[]) => new Map(rows.map((r) => [r.day, r]));
  const s = toMap(signups);
  const q = toMap(quiz);
  const e = toMap(exams);
  const p = toMap(sales);

  const label = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    day: "numeric",
    month: "short",
  });

  const days: TrendDay[] = [];
  const now = new Date();
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = tehranDayKey(d);
    days.push({
      day: key,
      label: label.format(d),
      signups: Number(s.get(key)?.n ?? 0),
      attempts: Number(q.get(key)?.n ?? 0) + Number(e.get(key)?.n ?? 0),
      // ⚠️ `sum` روی BIGINT در mysql2 می‌تواند رشته برگردد.
      revenueRials: Number(p.get(key)?.rials ?? 0),
      orders: Number(p.get(key)?.n ?? 0),
    });
  }

  return { state: "ok", days };
}

// ---------------------------------------------------------------------------
// سلامتِ سیستم
// ---------------------------------------------------------------------------

export type SystemHealth = {
  db: {
    ok: boolean;
    latencyMs: number | null;
    /** «MariaDB 10.11» یا «MySQL 8.0». */
    server: string | null;
    /** حجمِ دادهٔ این دیتابیس، مگابایت. */
    sizeMb: number | null;
    tehranTz: boolean;
  };
  maintenance: boolean;
  mailDriver: string;
  smsDriver: string;
  node: string;
  uptimeSeconds: number;
  release: string | null;
  activeSessions: number;
  /** درخواست‌های پرداختِ نیمه‌کاره در ۲۴ ساعتِ گذشته. */
  pendingOrders: number;
};

/**
 * آنچه مدیر پیش از «چرا سایت کند است؟» باید ببیند — روی یک کارت.
 *
 * ⚠️ هیچ بخشی نباید کلِ داشبورد را بیندازد: اگر دیتابیس جواب ندهد، کارت
 * همان را می‌گوید و بقیه‌اش (نسخهٔ Node، uptime) هنوز درست است.
 */
export async function adminSystemHealth(): Promise<SystemHealth> {
  await requireAdmin();

  let db: SystemHealth["db"] = { ok: false, latencyMs: null, server: null, sizeMb: null, tehranTz: false };
  let activeSessions = 0;
  let pendingOrders = 0;

  try {
    const started = performance.now();
    const v = await queryOne<{ version: string }>("select version() as version");
    const latencyMs = Math.round(performance.now() - started);

    const raw = v?.version ?? "";
    // «10.11.14-MariaDB-0ubuntu…» → «MariaDB 10.11.14»
    const isMaria = /mariadb/i.test(raw);
    const num = raw.match(/^\d+\.\d+(\.\d+)?/)?.[0] ?? raw;
    const server = raw ? `${isMaria ? "MariaDB" : "MySQL"} ${num}` : null;

    const size = await queryOne<{ bytes: number | string | null }>(
      `select sum(data_length + index_length) as bytes
         from information_schema.tables
        where table_schema = database()`,
    );

    const counts = await queryOne<{ sessions: number; orders: number }>(
      `select
         (select count(*) from sessions
           where revoked_at is null and expires_at > now(6))                    as sessions,
         (select count(*) from plus_orders
           where status = 'pending' and created_at > now(6) - interval 1 day)   as orders`,
    );
    activeSessions = Number(counts?.sessions ?? 0);
    pendingOrders = Number(counts?.orders ?? 0);

    db = {
      ok: true,
      latencyMs,
      server,
      sizeMb: size?.bytes != null ? Math.round((Number(size.bytes) / 1024 / 1024) * 10) / 10 : null,
      tehranTz: await tehranDayAvailable(),
    };
  } catch {
    /* کارت «دیتابیس در دسترس نیست» را نشان می‌دهد. */
  }

  const [maintenance, sms] = await Promise.all([
    maintenanceState(),
    smsStatus().catch(() => ({ driver: "نامعلوم" })),
  ]);

  return {
    db,
    maintenance: maintenance.on,
    mailDriver: mailAdapter().name,
    smsDriver: sms.driver,
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    release: process.env.APP_RELEASE?.trim() || null,
    activeSessions,
    pendingOrders,
  };
}

// ---------------------------------------------------------------------------
// نشان‌های منو
// ---------------------------------------------------------------------------

/** شمارِ کارهای منتظر، کلیدخورده با مسیرِ منو. */
export type NavBadges = Partial<Record<string, number>>;

/**
 * «چند کار منتظرِ من است» — کنارِ هر بخشِ منو.
 *
 * ⚠️ یک کوئری با چند زیرکوئری و نه پنج رفت‌وبرگشت: این در هر ناوبری
 * صدا زده می‌شود. همهٔ شرط‌ها روی ستون‌های ایندکس‌دار است (`status`،
 * `resolved_at`، `admin_unread`).
 */
export async function adminNavBadges(): Promise<NavBadges> {
  await requireAdmin();
  const row = await queryOne<{
    reports: number;
    errors: number;
    club: number;
    teachers: number;
    tickets: number;
  }>(
    `select
       (select count(*) from content_reports where status = 'open')                        as reports,
       (select count(*) from app_error_log where resolved_at is null)                as errors,
       (select count(*) from club_posts where status = 'pending')
         + (select count(*) from club_comments where status = 'pending')
         + (select count(*) from club_reports where status = 'open')                 as club,
       (select count(*) from teacher_requests where status = 'pending')              as teachers,
       (select count(*) from plus_tickets
         where admin_unread = 1 and status not in ('resolved', 'closed'))           as tickets`,
  );
  return {
    "/admin/reports": Number(row?.reports ?? 0),
    "/admin/activity": Number(row?.errors ?? 0),
    "/admin/club": Number(row?.club ?? 0),
    "/admin/teachers": Number(row?.teachers ?? 0),
    "/admin/plus": Number(row?.tickets ?? 0),
  };
}
