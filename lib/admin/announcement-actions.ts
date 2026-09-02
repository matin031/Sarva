"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg, boolArg, InvalidInputError } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import { safeExternalUrl, type AnnouncementTone } from "@/lib/site/content";

/**
 * ادارهٔ نوار اعلان سایت.
 *
 * فقط یکی از اعلان‌ها هم‌زمان دیده می‌شود (بالاترین اولویتِ فعالِ در بازه)،
 * ولی چند ردیف می‌تواند وجود داشته باشد — مثلاً اعلانِ فردا از حالا آماده و
 * زمان‌بندی شده باشد.
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

/** وضعیتِ محاسبه‌شده، برای نشان دادن در فهرست. */
export type AnnouncementStatus = "live" | "scheduled" | "expired" | "off";

export type AdminAnnouncement = {
  id: string;
  title: string | null;
  body: string;
  tone: AnnouncementTone;
  linkUrl: string | null;
  linkLabel: string | null;
  isActive: boolean;
  dismissible: boolean;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: AnnouncementStatus;
};

const TONES = ["info", "success", "warning", "critical"] as const;

const schema = z.object({
  id: z.uuid().nullish(),
  title: z.string().trim().max(120, "عنوان نباید بیشتر از ۱۲۰ نویسه باشد.").nullish(),
  body: z
    .string()
    .trim()
    .min(3, "متن اعلان را بنویسید.")
    .max(600, "متن اعلان نباید بیشتر از ۶۰۰ نویسه باشد — نوارِ بالای صفحه جای پاراگراف نیست."),
  tone: z.enum(TONES),
  linkUrl: z.string().trim().max(500).nullish(),
  linkLabel: z.string().trim().max(60, "برچسب دکمه نباید بیشتر از ۶۰ نویسه باشد.").nullish(),
  isActive: z.boolean(),
  dismissible: z.boolean(),
  priority: z.number().int().min(-100).max(100),
  /** رشتهٔ ISO یا خالی. */
  startsAt: z.string().trim().nullish(),
  endsAt: z.string().trim().nullish(),
});

export type AnnouncementInput = z.infer<typeof schema>;

function statusOf(row: {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}): AnnouncementStatus {
  if (!row.is_active) return "off";
  const now = Date.now();
  if (row.ends_at && Date.parse(row.ends_at) <= now) return "expired";
  if (row.starts_at && Date.parse(row.starts_at) > now) return "scheduled";
  return "live";
}

type Row = {
  id: string;
  title: string | null;
  body: string;
  tone: AnnouncementTone;
  link_url: string | null;
  link_label: string | null;
  is_active: boolean;
  dismissible: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

function toAdmin(r: Row): AdminAnnouncement {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    tone: r.tone,
    linkUrl: r.link_url,
    linkLabel: r.link_label,
    isActive: r.is_active,
    dismissible: r.dismissible,
    priority: r.priority,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    status: statusOf(r),
  };
}

export async function announcementAdminList(): Promise<AdminAnnouncement[]> {
  await requireAdmin();
  const rows = await query<Row>(
    `select id, title, body, tone, link_url, link_label, is_active, dismissible,
            priority, starts_at, ends_at, created_at, updated_at
       from site_announcements
      order by is_active desc, priority desc, created_at desc`,
  );
  return rows.map(toAdmin);
}

/** تاریخِ آمده از فرم را به مقدارِ ستون تبدیل می‌کند. */
function toTimestamp(value: string | null | undefined, field: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) throw new InvalidInputError(`${field} نامعتبر است.`);
  return new Date(ms).toISOString();
}

export async function announcementAdminSave(
  input: AnnouncementInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const data = parsed.data;

  // ⚠️ همان بررسیِ آدرسی که سمت عمومی هم انجام می‌شود، اینجا هم انجام
  // می‌شود — تا یک آدرسِ نامعتبر اصلاً ذخیره نشود و مدیر همان لحظه بفهمد،
  // نه اینکه بعداً دکمه بی‌صدا ناپدید شود.
  const linkUrl = data.linkUrl?.trim() ? safeExternalUrl(data.linkUrl) : null;
  if (data.linkUrl?.trim() && !linkUrl) {
    return {
      ok: false,
      errors: ["آدرس لینک معتبر نیست. فقط آدرس‌های https:// و http:// یا مسیرهای داخلی مثل /panel پذیرفته می‌شوند."],
    };
  }

  const linkLabel = linkUrl ? data.linkLabel?.trim() || null : null;
  if (linkUrl && !linkLabel) {
    return { ok: false, errors: ["برای لینک، متنِ دکمه را هم بنویسید."] };
  }

  const startsAt = toTimestamp(data.startsAt, "زمان شروع");
  const endsAt = toTimestamp(data.endsAt, "زمان پایان");
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    return { ok: false, errors: ["زمان پایان باید بعد از زمان شروع باشد."] };
  }

  const title = data.title?.trim() || null;

  const row = data.id
    ? await queryOne<{ id: string }>(
        `update site_announcements
            set title = $1, body = $2, tone = $3, link_url = $4, link_label = $5,
                is_active = $6, dismissible = $7, priority = $8,
                starts_at = $9, ends_at = $10
          where id = $11
        returning id`,
        [title, data.body, data.tone, linkUrl, linkLabel, data.isActive, data.dismissible,
         data.priority, startsAt, endsAt, uuidArg(data.id)],
      )
    : await queryOne<{ id: string }>(
        `insert into site_announcements
           (title, body, tone, link_url, link_label, is_active, dismissible,
            priority, starts_at, ends_at, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id`,
        [title, data.body, data.tone, linkUrl, linkLabel, data.isActive, data.dismissible,
         data.priority, startsAt, endsAt, admin.id],
      );

  if (!row) return { ok: false, errors: ["این اعلان پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: data.id ? "announcement.update" : "announcement.create",
    targetType: "announcement",
    targetId: row.id,
    summary: `${data.id ? "ویرایش" : "ساخت"} اعلان «${(title ?? data.body).slice(0, 60)}»`,
    metadata: {
      tone: data.tone,
      active: data.isActive,
      priority: data.priority,
      starts_at: startsAt,
      ends_at: endsAt,
      has_link: Boolean(linkUrl),
    },
  });

  revalidatePath("/admin/announcements");
  return { ok: true, data: { id: row.id } };
}

/** روشن/خاموش سریع، بدون باز کردن فرم — چیزی که در یک اختلال واقعاً لازم
 *  می‌شود. */
export async function announcementAdminToggle(id: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const announcementId = uuidArg(id, "شناسهٔ اعلان نامعتبر است.");
  const isActive = boolArg(active);

  const row = await queryOne<{ body: string }>(
    `update site_announcements set is_active = $1 where id = $2 returning body`,
    [isActive, announcementId],
  );
  if (!row) return { ok: false, errors: ["این اعلان پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: "announcement.update",
    targetType: "announcement",
    targetId: announcementId,
    summary: `اعلان «${row.body.slice(0, 60)}» ${isActive ? "روشن" : "خاموش"} شد`,
    metadata: { active: isActive },
  });

  revalidatePath("/admin/announcements");
  return { ok: true, data: null };
}

export async function announcementAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const announcementId = uuidArg(id, "شناسهٔ اعلان نامعتبر است.");

  // متن را *قبل* از حذف می‌خوانیم، وگرنه در لاگ فقط یک uuid می‌ماند.
  const existing = await queryOne<{ body: string }>(
    "select body from site_announcements where id = $1",
    [announcementId],
  );
  if (!existing) return { ok: false, errors: ["این اعلان پیدا نشد."] };

  await execute("delete from site_announcements where id = $1", [announcementId]);

  await recordAudit({
    actor: admin,
    action: "announcement.delete",
    targetType: "announcement",
    targetId: announcementId,
    summary: `حذف اعلان «${existing.body.slice(0, 60)}»`,
  });

  revalidatePath("/admin/announcements");
  return { ok: true, data: null };
}
