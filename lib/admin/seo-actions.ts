"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/admin/audit";
import { listSettings, type ListedSetting } from "@/lib/settings";
import { GRADES, getLesson } from "@/lib/doroos";
import { SEO_PAGE_LIST, lessonOrdinal } from "@/lib/seo/catalog";
import { lessonDescription, lessonFacts, lessonTitle } from "@/lib/seo/lesson";
import { externalChecks, internalChecks, type HealthCheck } from "@/lib/seo/health";
import { submitIndexNow } from "@/lib/seo/indexnow";
import { AI_PROBES, SEO_TASKS } from "@/lib/seo/playbook";
import { ensureIndexNowKey, readSeoState, updateSeoState, type SeoState } from "@/lib/seo/settings";
import { absoluteUrl, siteOrigin } from "@/lib/seo/site";
import { publicSitemapEntries } from "@/lib/seo/urls";

/**
 * اکشن‌های صفحهٔ «سئو»ی پنلِ مدیریت.
 *
 * ⚠️ هرکدام `requireAdmin()` خودش را دارد — گاردِ لایوتِ `/admin` جلوی
 * POSTِ مستقیم به یک Server Action را نمی‌گیرد (توضیحش بالای
 * app/admin/layout.tsx).
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

/** یک ردیفِ پیش‌نمایشِ گوگل. */
export type SerpRow = {
  path: string;
  url: string;
  /** عنوان همان‌طور که در `<title>` می‌نشیند (با « | سروا»). */
  title: string;
  description: string;
  group: string;
};

export type LessonRow = {
  grade: string;
  gradeLabel: string;
  book: string;
  number: number;
  ordinal: string;
  title: string | null;
  ready: boolean;
  url: string;
  /** فقط برای درس‌های آماده. */
  seoTitle?: string;
  seoDescription?: string;
};

/** اکشن‌هایی که صفحهٔ سرور به کامپوننتِ کلاینت می‌دهد (چرایی‌اش بالای SeoCenter). */
export type SeoActions = {
  internalChecks: () => Promise<HealthCheck[]>;
  externalChecks: () => Promise<HealthCheck[]>;
  markTask: (taskId: string, done: boolean) => Promise<ActionResult<SeoState>>;
  recordAiCheck: (probeId: string, seen: boolean) => Promise<ActionResult<SeoState>>;
  submitIndexNow: () => Promise<ActionResult<{ message: string; count: number; state: SeoState }>>;
};

export type SeoOverview = {
  origin: string;
  host: string;
  settings: ListedSetting[];
  state: SeoState;
  checks: HealthCheck[];
  serp: SerpRow[];
  lessons: LessonRow[];
  sitemapCount: number;
};

function withBrand(title: string, path: string): string {
  return path === "/" ? title : `${title} | سروا`;
}

export async function adminSeoOverview(): Promise<SeoOverview> {
  await requireAdmin();
  const origin = siteOrigin();

  const [settings, state, checks, entries] = await Promise.all([
    listSettings(),
    readSeoState(),
    internalChecks(),
    publicSitemapEntries(),
  ]);

  const serp: SerpRow[] = SEO_PAGE_LIST.map((p) => ({
    path: p.path,
    url: absoluteUrl(p.path),
    title: withBrand(p.title, p.path),
    description: p.description,
    group: "صفحه‌ها",
  }));

  const lessons: LessonRow[] = [];
  for (const grade of GRADES) {
    for (const ref of grade.lessons) {
      const path = `/doroos/${grade.key}/${ref.number}`;
      const row: LessonRow = {
        grade: grade.key,
        gradeLabel: grade.label,
        book: grade.book,
        number: ref.number,
        ordinal: lessonOrdinal(ref.number),
        title: ref.title ?? null,
        ready: ref.ready,
        url: absoluteUrl(path),
      };
      if (ref.ready) {
        const lesson = await getLesson(grade.key, ref.number);
        if (lesson) {
          const facts = lessonFacts(lesson);
          row.seoTitle = withBrand(lessonTitle(grade, ref.number, facts), path);
          row.seoDescription = lessonDescription(grade, ref.number, facts);
          serp.push({
            path,
            url: row.url,
            title: row.seoTitle,
            description: row.seoDescription,
            group: `درس‌های ${grade.book}`,
          });
        }
      }
      lessons.push(row);
    }
  }

  return {
    origin,
    host: new URL(origin).hostname,
    settings: settings.filter((s) => s.group === "seo"),
    state,
    checks,
    serp,
    lessons,
    sitemapCount: entries.length,
  };
}

/** آزمون‌های بیرونی — جدا، چون چند ثانیه طول می‌کشند و صفحه نباید منتظرشان بماند. */
export async function adminSeoExternalChecks(): Promise<HealthCheck[]> {
  await requireAdmin();
  return externalChecks();
}

export async function adminSeoInternalChecks(): Promise<HealthCheck[]> {
  await requireAdmin();
  return internalChecks();
}

export async function adminSeoMarkTask(taskId: string, done: boolean): Promise<ActionResult<SeoState>> {
  const admin = await requireAdmin();
  const task = SEO_TASKS.find((t) => t.id === taskId);
  if (!task) return { ok: false, errors: ["کارِ ناشناخته."] };

  const state = await updateSeoState(admin.id, (s) => {
    const next = { ...s, done: { ...s.done } };
    if (done) next.done[taskId] = new Date().toISOString();
    else delete next.done[taskId];
    return next;
  });

  if (done) {
    await recordAudit({
      actor: admin,
      action: "seo.task_done",
      targetType: "setting",
      targetId: "seo.state",
      summary: `کارِ سئو انجام شد: ${task.title}`,
    });
  }
  revalidatePath("/admin/seo");
  return { ok: true, data: state };
}

export async function adminSeoRecordAiCheck(
  probeId: string,
  seen: boolean,
): Promise<ActionResult<SeoState>> {
  const admin = await requireAdmin();
  const probe = AI_PROBES.find((p) => p.id === probeId);
  if (!probe) return { ok: false, errors: ["پرسشِ ناشناخته."] };

  const state = await updateSeoState(admin.id, (s) => ({
    ...s,
    aiChecks: { ...(s.aiChecks ?? {}), [probeId]: { at: new Date().toISOString(), seen } },
  }));

  await recordAudit({
    actor: admin,
    action: "seo.ai_check",
    targetType: "setting",
    targetId: "seo.state",
    summary: `آزمونِ هوش مصنوعی (${probe.intent}): ${seen ? "سروا دیده شد" : "سروا دیده نشد"}`,
  });
  revalidatePath("/admin/seo");
  return { ok: true, data: state };
}

/**
 * همهٔ نشانی‌های sitemap را برای Bing، Yandex و بقیهٔ موتورهای IndexNow
 * می‌فرستد. کلید اگر نباشد، همین‌جا ساخته می‌شود.
 */
export async function adminSeoSubmitIndexNow(): Promise<
  ActionResult<{ message: string; count: number; state: SeoState }>
> {
  const admin = await requireAdmin();

  const key = await ensureIndexNowKey(admin.id);
  const urls = (await publicSitemapEntries()).map((e) => e.url);
  const result = await submitIndexNow(urls, key);

  const state = await updateSeoState(admin.id, (s) => ({
    ...s,
    indexNow: {
      at: new Date().toISOString(),
      status: result.status,
      ok: result.ok,
      count: urls.length,
      message: result.message,
    },
    // ارسالِ موفق، کارِ هفتگیِ «خبر دادن» را هم تیک می‌زند.
    done: result.ok ? { ...s.done, "indexnow-weekly": new Date().toISOString() } : s.done,
  }));

  await recordAudit({
    actor: admin,
    action: "seo.indexnow_submit",
    targetType: "setting",
    targetId: "seo.indexnow_key",
    summary: `ارسالِ ${urls.length} نشانی به IndexNow — ${result.ok ? "پذیرفته شد" : "ناموفق"} (${result.status})`,
  });
  revalidatePath("/admin/seo");

  return result.ok
    ? { ok: true, data: { message: result.message, count: urls.length, state } }
    : { ok: false, errors: [result.message] };
}
