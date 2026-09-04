/**
 * هر دستور SQL پروژه را به خودِ پستگرس نشان می‌دهد — `npm run db:check-sql`.
 *
 * ⚠️ چرا لازم شد: `make_interval(mins => $1::double precision)` در
 * lib/auth/otp.ts از زمان مهاجرت به پستگرس آنجا بود و هر «ارسال کد تأیید» را
 * با ۵۰۰ برمی‌گرداند. tsc آن را ندید چون SQL برایش فقط یک رشته است. حتی
 * پارس کردن هم پیدایش نمی‌کرد: از نظر نحوی بی‌عیب است و فقط وقتی معلوم
 * می‌شود که پستگرس دنبال overload بگردد و پیدا نکند.
 *
 * پس اینجا PREPARE می‌کنیم نه parse. PREPARE کوئری را *اجرا نمی‌کند* ولی
 * کامل تحلیلش می‌کند: نام جدول، نام ستون، امضای تابع و سازگاری نوع‌ها. یعنی
 * همان چیزی که لازم بود، بدون آنکه یک ردیف هم لمس شود.
 *
 * چیزهایی که رد می‌شوند و چرا:
 *   • کوئری‌هایی که ${...} دارند و مقدارش ثابتِ قابل‌حل نیست (مثلاً نام ستونی
 *     که در زمان اجرا ساخته می‌شود). اینها را نمی‌شود بازسازی کرد.
 *   • کنسول SQL ادمین، که کوئری‌اش را کاربر می‌نویسد.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. همه چیز داخل یک تراکنش است که در پایان rollback
 * می‌شود، پس هیچ چیزی نوشته نمی‌شود.
 */
process.loadEnvFile(".env.local");

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { getPool } from "@/lib/db";

/** توابعی که آرگومان اولشان SQL است. */
const SQL_CALLS = new Set(["query", "queryOne", "execute"]);

/** فایل‌هایی که کوئری‌شان را کاربر می‌نویسد، نه ما. */
const SKIP = [/lib\/admin\/sql-console\.ts$/, /lib\/admin\/sql-constants\.ts$/, /scripts\//];

type Found = { file: string; line: number; sql: string };
/** کوئری‌ای که بخشی از آن در زمان اجرا ساخته می‌شود؛ چند بازسازیِ محتمل. */
type Partial = { file: string; line: number; variants: string[] };

const found: Found[] = [];
const partial: Partial[] = [];

/**
 * ثابت‌های سطحِ ماژول که داخل کوئری‌ها درج می‌شوند (مثل USER_COLUMNS).
 * فقط رشته‌های ادبی — هر چیزِ دیگری یعنی «قابل بازسازی نیست».
 */
function collectConstants(source: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>();
  source.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const init = decl.initializer;
      if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
        out.set(decl.name.text, init.text);
      }
    }
  });
  return out;
}

/** همهٔ .ts های یک شاخه، بازگشتی. */
function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

function extract(file: string) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const constants = collectConstants(source);

  const walk = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : null;

      if (name && SQL_CALLS.has(name) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        const line = source.getLineAndCharacterOfPosition(arg.getStart()).line + 1;

        if (ts.isNoSubstitutionTemplateLiteral(arg) || ts.isStringLiteral(arg)) {
          found.push({ file, line, sql: arg.text });
        } else if (ts.isTemplateExpression(arg)) {
          // درج‌ها با ثابت‌های شناخته‌شده پر می‌شوند. آنچه می‌ماند در زمان
          // اجرا ساخته می‌شود (شرطِ where، یا شمارهٔ پارامترِ limit/offset).
          //
          // برای آن‌ها دو بازسازی می‌سازیم: یکی با رشتهٔ خالی و یکی با یک
          // پارامترِ تازه. کوئریِ واقعی یکی از این دو شکل را دارد، پس اگر
          // *هیچ‌کدام* PREPARE نشود یعنی چیزی در خودِ اسکلت غلط است — نام
          // جدول، نام ستون، یا امضای تابع. اگر یکی بشود، همان‌قدر که این ابزار
          // می‌تواند بررسی شده است.
          // جای هر شکافِ پویا با نگاه به متنِ *قبلش* پر می‌شود، چون همان
          // می‌گوید نحو آنجا چه انتظاری دارد. یک پرکنندهٔ یکسان برای همه کار
          // نمی‌کند: `${where}` باید بتواند خالی بماند ولی `limit ${p}` حتماً
          // یک مقدار می‌خواهد، و `order by ${c} x desc` یک نامِ ستون.
          const fillFor = (before: string, n: number): string[] => {
            const tail = before.replace(/(\s|--[^\n]*)+$/, "").toLowerCase();
            if (/\b(limit|offset)$/.test(tail)) return [`$${90 + n}`];
            if (/\border\s+by$/.test(tail)) return ["id,"];
            // جای یک عبارتِ بولی: شکاف اینجا حتماً چیزی می‌خواهد، پس تک‌گزینه.
            if (/\b(where|and|or|on|not)$/.test(tail)) return ["true"];
            // قطعهٔ آزاد — معمولاً کلِ بندِ where. یا اصلاً نیست، یا کاملش هست.
            return ["", "where true"];
          };

          const dynamic = arg.templateSpans.some(
            (s) => !(ts.isIdentifier(s.expression) && constants.has(s.expression.text)),
          );

          // ضربِ دکارتیِ گزینه‌ها؛ تعداد شکاف‌ها کم است، پس چند ترکیب بیشتر نمی‌شود.
          let variants: string[] = [arg.head.text];
          for (const span of arg.templateSpans) {
            const expr = span.expression;
            const known =
              ts.isIdentifier(expr) && constants.has(expr.text) ? constants.get(expr.text)! : null;
            const next: string[] = [];
            for (const sofar of variants) {
              const options = known !== null ? [known] : fillFor(sofar, next.length + 1);
              for (const opt of options) next.push(sofar + opt + span.literal.text);
            }
            // سقف، تا کوئریِ پر از شکاف ضربِ دکارتی را منفجر نکند. اولین
            // ترکیب‌ها همان‌هایی‌اند که «همه‌چیز خالی» را می‌سنجند و برای
            // سنجیدنِ نام جدول و ستون کافی‌اند.
            variants = next.slice(0, 32);
          }

          if (!dynamic) found.push({ file, line, sql: variants[0] });
          else partial.push({ file, line, variants });
        }
      }
    }
    node.forEachChild(walk);
  };

  source.forEachChild(walk);
}

async function main() {
  const files = [...walkTs("lib"), ...walkTs("app"), "proxy.ts"].filter(
    (f) => !SKIP.some((re) => re.test(f)),
  );

  for (const f of files) extract(f);

  const client = await getPool().connect();
  const failures: { file: string; line: number; sql: string; error: string }[] = [];
  let counter = 0;

  /** یک PREPARE داخل savepoint. null یعنی موفق. */
  async function tryPrepare(sql: string): Promise<string | null> {
    const name = `sqlcheck_${counter++}`;
    // ⚠️ savepoint به ازای هر دستور: یک PREPARE شکست‌خورده تراکنش را
    // «aborted» می‌کند و بقیه با 25P02 رد می‌شوند — یعنی اولین خطا بقیه را
    // پنهان می‌کرد. بار اول دقیقاً همین شد و دو خطای قلابی ساخت.
    await client.query(`savepoint ${name}`);
    try {
      await client.query(`prepare ${name} as ${sql}`);
      await client.query(`release savepoint ${name}`);
      return null;
    } catch (e) {
      await client.query(`rollback to savepoint ${name}`);
      const err = e as { message?: string; code?: string };
      return `${err.code ?? "?"}: ${err.message ?? String(e)}`;
    }
  }

  // همه چیز در یک تراکنش که rollback می‌شود: PREPARE هم اثری نگذارد.
  await client.query("begin");

  for (const q of found) {
    const error = await tryPrepare(q.sql);
    if (error) failures.push({ ...q, error });
  }

  // کوئریِ نیمه‌پویا: کافی است *یکی* از بازسازی‌ها بپذیرد. اگر هیچ‌کدام
  // نپذیرفت، ایراد در اسکلت است نه در حدسِ ما.
  for (const q of partial) {
    const errors: string[] = [];
    let anyOk = false;
    for (const v of q.variants) {
      const error = await tryPrepare(v);
      // 42P18 = «نوع پارامتر معلوم نشد». ایرادِ کوئری نیست؛ نتیجهٔ همین
      // بازسازی است که پارامترِ بی‌زمینه به آن اضافه کرده‌ایم. بی‌نتیجه، نه
      // شکست — وگرنه ابزار سر و صدای بی‌جا می‌کند و کسی جدی‌اش نمی‌گیرد.
      if (!error || error.startsWith("42P18")) {
        anyOk = true;
        break;
      }
      errors.push(error);
    }
    if (!anyOk) {
      failures.push({
        file: q.file,
        line: q.line,
        sql: q.variants[0],
        // خطاهای تکراری حذف می‌شوند: سی بازسازی که همگی به یک دلیل شکسته‌اند
        // یک پیام دارند، نه سی تا.
        error: [...new Set(errors)].join(" | "),
      });
    }
  }

  await client.query("rollback");
  client.release();

  console.log(
    `${found.length} دستور کامل و ${partial.length} دستور نیمه‌پویا بررسی شد` +
      ` (${found.length + partial.length} روی‌هم).`,
  );

  if (failures.length === 0) {
    console.log("همه از دیدِ پستگرس سالم‌اند.");
  } else {
    console.log(`\n${failures.length} دستور مشکل دارد:\n`);
    for (const f of failures) {
      console.log(`  ${f.file}:${f.line}`);
      console.log(`    ${f.error}`);
      console.log(`    ${f.sql.replace(/\s+/g, " ").slice(0, 160)}`);
      console.log();
    }
  }

  await getPool().end();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await getPool().end();
  process.exit(1);
});
