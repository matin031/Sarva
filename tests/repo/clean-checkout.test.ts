import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * «آیا یک checkout تمیز از مخزن کار می‌کند؟»
 *
 * =============================================================================
 * ⚠️ چرا این آزمون وجود دارد
 * =============================================================================
 *
 * یک بار commit ای ثبت شد که روی ماشینِ خودمان کامل سبز بود — tsc، تست،
 * build، و حتی مهاجرت روی MariaDB واقعی — ولی روی یک checkout تمیز اصلاً
 * بالا نمی‌آمد.
 *
 * علت: کدِ commit‌شده از دو ماژول import می‌کرد که هنوز untracked بودند، و
 * مهاجرتی که ستون‌های موردنیازش را می‌ساخت هرگز commit نشده بود. همهٔ
 * ابزارها سبز بودند چون همه‌شان *working tree* را می‌بینند — و working tree
 * آن فایل‌ها را داشت.
 *
 * هیچ‌کدام از بررسی‌های موجود این را نمی‌گرفتند. این یکی می‌گیرد.
 *
 * ⚠️ عمداً به دیتابیس نیاز ندارد، تا در `npm test` روی هر ماشینی اجرا شود.
 */

const ROOT = process.cwd();

/** بیرون از یک مخزن گیت (نصب از روی zip، یا CI بدون تاریخچه) این آزمون
 *  موضوعی برای سنجیدن ندارد. */
const inGitRepo = existsSync(join(ROOT, ".git"));

const git = (args: string[]): string =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

describe("checkoutِ تمیز", { skip: inGitRepo ? false : "بیرون از مخزن گیت" }, () => {
  /**
   * ⚠️ همه‌چیز از **HEAD** خوانده می‌شود و نه از working tree.
   *
   * این تفاوت، کلِ نکتهٔ این فایل است: یک checkout تمیز دقیقاً همان چیزی را
   * می‌گیرد که commit شده. اگر working tree را می‌خواندیم، کارِ ناتمامِ روی
   * دیسک هم شمرده می‌شد و آزمون برای دلایلی قرمز می‌شد که ربطی به «آیا این
   * commit سالم است؟» ندارند.
   */
  const atHead = new Set(
    git(["ls-tree", "-r", "--name-only", "HEAD"])
      .split("\n")
      .filter(Boolean)
      .map((s) => s.replace(/\\/g, "/")),
  );

  /**
   * ⚠️ مهم‌ترین آزمونِ این فایل.
   *
   * هر فایلی که در HEAD هست و از `@/…` چیزی وارد می‌کند، آن مقصد هم باید در
   * HEAD باشد. اگر نباشد، یک checkout تمیز همان‌جا می‌شکند.
   *
   * ⚠️ با **یک** `git grep` روی ref و نه `git show` به‌ازای هر فایل: نسخهٔ
   * اول برای ~۱۵۰۰ فایل یک پروسه می‌ساخت و غیرقابل‌تحمل بود.
   */
  test("هر import از @/ در HEAD به فایلی در همان HEAD می‌رسد", () => {
    let raw = "";
    try {
      // خروجی: `HEAD:path/to/file.ts:import … from "@/x"`
      raw = git(["grep", "-I", "-E", "from +[\"']@/", "HEAD", "--", "*.ts", "*.tsx", "*.mjs"]);
    } catch {
      // `git grep` وقتی چیزی پیدا نکند کدِ ۱ می‌دهد — یعنی هیچ importی نیست.
      raw = "";
    }

    const broken: string[] = [];

    for (const line of raw.split("\n")) {
      if (!line) continue;
      // `HEAD:` را بردار، بعد اولین `:` مسیر را از محتوا جدا می‌کند.
      const withoutRef = line.startsWith("HEAD:") ? line.slice("HEAD:".length) : line;
      const sep = withoutRef.indexOf(":");
      if (sep === -1) continue;

      const file = withoutRef.slice(0, sep).replace(/\\/g, "/");
      const content = withoutRef.slice(sep + 1);

      if (!/^(lib|app|components|scripts)\//.test(file)) continue;

      for (const match of content.matchAll(/from\s+["']@\/([^"']+)["']/g)) {
        const spec = match[1];
        // مسیری که خودش پسوند دارد (مثلاً یک CSS module) به خودش حل می‌شود.
        const candidates = /\.\w+$/.test(spec)
          ? [spec]
          : [
              `${spec}.ts`,
              `${spec}.tsx`,
              `${spec}/index.ts`,
              `${spec}/index.tsx`,
              `${spec}.json`,
              `${spec}.mjs`,
            ];
        if (!candidates.some((c) => atHead.has(c))) broken.push(`${file} → @/${spec}`);
      }
    }

    assert.deepEqual(
      broken,
      [],
      `این importها به فایلی می‌رسند که در HEAD نیست:\n  ${broken.join("\n  ")}`,
    );
  });

  /**
   * ⚠️ مهاجرت‌ها باید در HEAD باشند، وگرنه `db:migrate` روی یک checkout تمیز
   * اسکیمای ناقص می‌سازد — و بدترین حالتش این است که **بی‌صدا** ناقص
   * بسازد، چون اجراکننده فقط فایل‌هایی را می‌بیند که وجود دارند.
   */
  test("هیچ مهاجرتی untracked نمانده", () => {
    const untracked = git(["status", "--porcelain", "--", "mysql-migrations"])
      .split("\n")
      .filter((l) => l.startsWith("??"))
      .map((l) => l.slice(3).trim());

    assert.deepEqual(
      untracked,
      [],
      `این مهاجرت‌ها در گیت نیستند:\n  ${untracked.join("\n  ")}`,
    );
  });

  /**
   * شماره‌گذاری باید پیوسته باشد.
   *
   * ⚠️ اجراکننده فایل‌ها را مرتب‌شده اجرا می‌کند و شکافِ شماره خطا نمی‌دهد.
   * ولی یک شکاف تقریباً همیشه یعنی فایلی جا مانده — دقیقاً همان اتفاقی که
   * با ۰۰۶ تا ۰۰۸ افتاد.
   */
  test("شماره‌گذاری مهاجرت‌ها در HEAD بدون شکاف است", () => {
    const prefix = "mysql-migrations/";
    const numbers = [...atHead]
      .filter((f) => new RegExp(`^${prefix}\\d{3}_.*\\.sql$`).test(f))
      .map((f) => Number(f.slice(prefix.length, prefix.length + 3)))
      .sort((a, b) => a - b);

    assert.ok(numbers.length > 0, "هیچ مهاجرتی در HEAD نیست");
    assert.equal(numbers[0], 1, "زنجیره باید از ۰۰۱ شروع شود");

    const gaps = numbers.filter((n, i) => i > 0 && n !== numbers[i - 1] + 1);
    assert.deepEqual(gaps, [], `شکاف در شماره‌گذاری پیش از: ${gaps.join("، ")}`);
  });
});
