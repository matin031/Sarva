import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * «هیچ جملهٔ فارسی‌ای با نقطه شروع نمی‌شود.»
 *
 * =============================================================================
 * ⚠️ چرا این آزمون وجود دارد
 * =============================================================================
 *
 * در `components/UI/MobileLoginForm.tsx` این خط نشسته بود:
 *
 *     .کد تأیید با پیامک برایت ارسال می‌شود
 *
 * نقطه واقعاً **اولین نویسهٔ رشته** بود. و این خطا از آن دسته‌ای است که
 * هیچ ابزاری نمی‌گیرد و چشم هم نمی‌گیرد:
 *
 *   • در ویرایشگر درست به نظر می‌آید. ویرایشگر متنِ راست‌به‌چپ را
 *     راست‌به‌چپ می‌چیند، پس نقطهٔ *ابتدای* رشته در *انتهای چپِ* خط دیده
 *     می‌شود — دقیقاً جایی که انتظار داریم.
 *   • `tsc` و ESLint رشته را یک رشته می‌بینند و کاری به محتوایش ندارند.
 *   • در مرورگر، همان نقطه آغازِ منطقیِ جمله است و سمتِ راست رندر می‌شود:
 *     کاربر جمله‌ای می‌بیند که با نقطه شروع شده.
 *
 * یعنی تنها راهِ کشفش، دیدنِ صفحه در مرورگر و *دقت کردن* است. این آزمون
 * جایش را می‌گیرد.
 *
 * ⚠️ «…» و «...» هم همین‌اند، و همین فرم دومیِش را داشت:
 * `"...در حال ورود"` روی دکمهٔ ورود.
 *
 * فقط نقطهٔ چسبیده به حرفِ فارسی گرفته می‌شود. `.map(...)` و
 * `.string()` و هر زنجیرهٔ متدِ دیگری دست‌نخورده می‌مانند، چون نویسهٔ بعدِ
 * نقطه در آن‌ها لاتین است.
 */

const ROOTS = ["app", "components", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

/** حرفِ فارسی/عربی، یا نیم‌فاصله — یعنی «اینجا یک جملهٔ فارسی شروع شده». */
const PERSIAN = /[\u0600-\u06FF\u200c]/;

/** مسیر ویندوزی → مسیر با اسلشِ رو به جلو، تا پیام روی هر سیستمی یکی باشد. */
function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("نقطه‌گذاری متن راست‌به‌چپ", () => {
  test("هیچ جملهٔ فارسی‌ای با نقطه شروع نمی‌شود", () => {
    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of walk(join(process.cwd(), root))) {
        const lines = readFileSync(file, "utf8").split("\n");

        lines.forEach((line, index) => {
          /* ⚠️ کامنت‌ها کنار گذاشته می‌شوند.
             توضیحِ فارسیِ داخلِ کامنت می‌تواند هر شکلی داشته باشد و کاربر
             هیچ‌وقت نمی‌بیندش؛ گرفتنِ آن فقط این آزمون را پرسروصدا می‌کند. */
          const code = line.trim();
          if (code.startsWith("*") || code.startsWith("//")) return;

          /* دو حالت: متنِ برهنهٔ JSX در ابتدای خط، و رشته‌ای که با نقطه
             باز می‌شود. */
          const bareJsx = /^(?:\.{1,3}|\u2026)[\u0600-\u06FF\u200c]/.test(code);
          const inString = /["'`]\.[\u0600-\u06FF\u200c]/.test(code);
          if (!bareJsx && !inString) return;
          if (!PERSIAN.test(code)) return;

          offenders.push(`${toPosix(relative(process.cwd(), file))}:${index + 1}`);
        });
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `این خط‌ها با نقطه شروع می‌شوند؛ نقطه باید به انتهای جمله برود:\n  ${offenders.join("\n  ")}`,
    );
  });
});
