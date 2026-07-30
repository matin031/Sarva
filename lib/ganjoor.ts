/**
 * جست‌وجوی وزن در گنجور — برچسبِ انسانی، پس وقتی پیدا شود قابلِ اعتمادترین منبع است.
 *
 * چرا اول این و بعد موتور:
 *   موتورِ محلی روی مجموعهٔ آزمونِ کنارگذاشته ۷۵.۵٪ دقت دارد و ۱.۹ ثانیه CPU
 *   می‌خورد. گنجور برای شعرِ کلاسیکِ ثبت‌شده وزنِ *دستی‌ثبت‌شده* را می‌دهد —
 *   عملاً بی‌خطا و تقریباً بی‌هزینهٔ CPU (فقط یک درخواستِ شبکه). پس:
 *     شعرِ معروف → گنجور (دقیق، سبک)
 *     شعرِ تازه/دست‌نویس → موتورِ محلی (تنها گزینه)
 */

const SEARCH_TIMEOUT_MS = 4000; // کاربر منتظرِ ما است؛ گنجورِ کند نباید کلِ پاسخ را گروگان بگیرد
const POEM_TIMEOUT_MS = 4000;

/** حذفِ نویسه‌های نامرئی، نشانه‌های سجاوندی و همهٔ فاصله‌ها — برای تطبیقِ مقاوم. */
function squash(s: string): string {
  return s
    .replace(/[‌‏‎ً-ْ]/g, "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[أإٱآ]/g, "ا")
    .replace(/[،؛؟!»«”“"'`.,:;?!()[\]{}\-_–—…]/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

async function getJson(url: string, ms: number): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // شبکه/timeout/JSONِ خراب — بی‌صدا به موتورِ محلی واگذار می‌شود
  } finally {
    clearTimeout(timer);
  }
}

/**
 * → رشتهٔ وزنِ گنجور («ارکان (نامِ بحر)») یا undefined اگر پیدا نشد.
 * هرگز پرتاب نمی‌کند؛ شکست یعنی «نمی‌دانم»، تا موتورِ محلی جواب بدهد.
 */
export async function findMeterOnGanjoor(
  mesra1: string,
  mesra2?: string,
): Promise<string | undefined> {
  const term = (mesra1 || "").trim();
  if (term.length < 8) return undefined;

  // ★ نسخهٔ پیشین term را encode نمی‌کرد، پس هر بیتی که «؟» یا «&» داشت
  //   پرس‌وجو را خراب می‌کرد.
  const list = await getJson(
    `https://api.ganjoor.net/api/ganjoor/poems/search?term=${encodeURIComponent(term)}`,
    SEARCH_TIMEOUT_MS,
  );
  if (!Array.isArray(list) || list.length === 0) return undefined;

  const needle1 = squash(mesra1);
  const needle2 = mesra2 ? squash(mesra2) : "";

  // بهترین تطبیق: شعری که *هر دو* مصراع در آن باشد، وگرنه مصراعِ اول.
  // نسخهٔ پیشین [0].id را بی‌بررسی می‌گرفت و روی فهرستِ خالی پرتاب می‌کرد.
  let best: number | undefined;
  let bestScore = 0;
  for (const item of list as { id?: number; plainText?: string }[]) {
    if (!item?.id || !item.plainText) continue;
    const hay = squash(item.plainText);
    let score = 0;
    if (needle1 && hay.includes(needle1)) score += 2;
    if (needle2 && hay.includes(needle2)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = item.id;
    }
  }
  if (!best || bestScore < 2) return undefined; // مصراعِ اول باید واقعاً در متن باشد

  const poem = (await getJson(
    `https://api.ganjoor.net/api/ganjoor/poem/${best}`,
    POEM_TIMEOUT_MS,
  )) as { sections?: { ganjoorMetre?: { rhythm?: string } }[] } | null;

  const rhythm = poem?.sections?.[0]?.ganjoorMetre?.rhythm;
  return typeof rhythm === "string" && rhythm.trim() ? rhythm.trim() : undefined;
}
