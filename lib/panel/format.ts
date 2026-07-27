/** Shared formatting for the user panel. */

const TEHRAN = "Asia/Tehran";

/** ۱۴۰۳/۰۵/۱۲ */
export function jalali(iso: string): string {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: TEHRAN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")}`;
}

/** ۱۲ مرداد ۱۴۰۳ */
export function jalaliLong(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: TEHRAN,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** ۱۴:۳۲ */
export function clock(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: TEHRAN,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** «امروز» / «دیروز» / «۳ روز پیش» / a date once it is far enough back. */
export function relativeDay(iso: string): string {
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TEHRAN,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const today = new Date();
  const target = new Date(iso);
  const diff = Math.round(
    (Date.parse(dayKey(today)) - Date.parse(dayKey(target))) / 86_400_000,
  );
  if (diff <= 0) return "امروز";
  if (diff === 1) return "دیروز";
  if (diff < 7) return `${fa(diff)} روز پیش`;
  if (diff < 30) return `${fa(Math.floor(diff / 7))} هفته پیش`;
  return jalaliLong(iso);
}

/** Persian digits. */
export function fa(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** «۸۵٪» */
export function pct(part: number, whole: number): string {
  if (!whole) return "۰٪";
  return `${fa(Math.round((part / whole) * 100))}٪`;
}

export function ratio(part: number, whole: number): number {
  return whole ? part / whole : 0;
}

/** Group a time-ordered list of events into sessions.
 *
 *  واژه‌یاب and جاسوس write one row per answer with no run id, so a "round"
 *  has to be recovered from the timestamps: answers belonging to one sitting
 *  arrive minutes apart, and the next sitting is hours or days later. A gap
 *  longer than `gapMinutes` starts a new session.
 *
 *  `items` must be sorted newest-first, which is how the panel queries read. */
export function groupIntoSessions<T>(
  items: T[],
  at: (item: T) => string,
  gapMinutes = 30,
): T[][] {
  const sessions: T[][] = [];
  let current: T[] = [];
  let lastTs = 0;

  for (const item of items) {
    const ts = Date.parse(at(item));
    if (current.length && lastTs - ts > gapMinutes * 60_000) {
      sessions.push(current);
      current = [];
    }
    current.push(item);
    lastTs = ts;
  }
  if (current.length) sessions.push(current);
  return sessions;
}

/** Bucket timestamps into the last `days` calendar days, Tehran time. */
export function dailyBuckets(
  isoDates: { at: string; ok: boolean }[],
  days = 14,
): { label: string; total: number; correct: number }[] {
  const keyOf = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TEHRAN,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const out: { label: string; total: number; correct: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = keyOf(d);
    const same = isoDates.filter((x) => keyOf(new Date(x.at)) === key);
    out.push({
      label: new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        timeZone: TEHRAN,
        day: "numeric",
        month: "short",
      }).format(d),
      total: same.length,
      correct: same.filter((x) => x.ok).length,
    });
  }
  return out;
}

/** Consecutive days ending today on which the student answered anything. */
export function streak(isoDates: string[]): number {
  const keyOf = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TEHRAN,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const active = new Set(isoDates.map((iso) => keyOf(new Date(iso))));
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    if (active.has(keyOf(d))) n++;
    else if (i > 0) break; // today may legitimately be empty
  }
  return n;
}
