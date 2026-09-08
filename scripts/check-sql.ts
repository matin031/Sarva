/**
 * هر دستور SQL پروژه را به خودِ MySQL نشان می‌دهد — `npm run db:check-sql`.
 *
 * ⚠️ چرا لازم است: `tsc` داخل یک template literal را نمی‌بیند. SQL برایش فقط
 * یک رشته است، پس نام ستونِ اشتباه، تابعِ ناموجود و نحوِ غلط همگی از کامپایل
 * رد می‌شوند و در زمان اجرا ۵۰۰ می‌دهند.
 *
 * در دوران PostgreSQL این ابزار دقیقاً به همین دلیل ساخته شد:
 * `make_interval(mins => $1::double precision)` ماه‌ها در lib/auth/otp.ts بود
 * و هر «ارسال کد تأیید» را می‌شکست. نحوش بی‌عیب بود؛ فقط overload نداشت.
 *
 * پس PREPARE می‌کنیم نه parse. PREPARE کوئری را *اجرا نمی‌کند* ولی کامل
 * تحلیلش می‌کند. با MySQL 8.0.46 آزموده شد که این چهار دسته را می‌گیرد:
 *
 *     select nonexistent_col from users        → 1054 Unknown column
 *     select * from nonexistent_table          → 1146 Table doesn't exist
 *     select make_interval(5)                  → 1305 FUNCTION does not exist
 *     select count(*) filter (where …)         → 1064 syntax error
 *
 * یعنی همان دستهٔ سومی که هیچ parser ای نمی‌گیرد، اینجا گرفته می‌شود.
 *
 * ⚠️ تفاوت مهم با نسخهٔ PostgreSQL این ابزار:
 *
 *   • آنجا همه‌چیز داخل یک تراکنش بود که در پایان rollback می‌شد، و هر
 *     PREPARE یک savepoint داشت چون یک خطا کل تراکنش را abort می‌کرد.
 *   • در MySQL، PREPARE اصلاً تراکنش را abort نمی‌کند و خودش هم چیزی
 *     نمی‌نویسد. پس نه تراکنش لازم است نه savepoint. در عوض هر statement
 *     باید DEALLOCATE شود، وگرنه به سقف max_prepared_stmt_count می‌خوریم.
 *
 * چیزهایی که رد می‌شوند و چرا:
 *   • کنسول SQL مدیر، که کوئری‌اش را کاربر می‌نویسد.
 *   • کوئری‌هایی که ${...} دارند و مقدارش ثابتِ قابل‌حل نیست؛ برایشان چند
 *     بازسازی امتحان می‌شود و در گزارش جدا شمرده می‌شوند.
 */
process.loadEnvFile(".env.local");

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import mysql from "mysql2/promise";

/** توابعی که آرگومان اولشان SQL است. */
const SQL_CALLS = new Set(["query", "queryOne", "execute", "insertId"]);

/** فایل‌هایی که کوئری‌شان را کاربر می‌نویسد، نه ما. */
const SKIP = [/lib\/admin\/sql-console\.ts$/, /lib\/admin\/sql-constants\.ts$/, /scripts\//];

type Found = { file: string; line: number; sql: string };
type PartialQ = { file: string; line: number; variants: string[] };

const found: Found[] = [];
const partial: PartialQ[] = [];

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
          // جای هر شکافِ پویا با نگاه به متنِ *قبلش* پر می‌شود، چون همان
          // می‌گوید نحو آنجا چه انتظاری دارد. یک پرکنندهٔ یکسان برای همه کار
          // نمی‌کند: `${where}` باید بتواند خالی بماند ولی `limit ${n}` حتماً
          // یک مقدار می‌خواهد.
          const fillFor = (before: string): string[] => {
            const tail = before.replace(/(\s|--[^\n]*|#[^\n]*)+$/, "").toLowerCase();
            if (/\b(limit|offset)$/.test(tail)) return ["1"];
            if (/\border\s+by$/.test(tail)) return ["id"];
            if (/\b(where|and|or|on|not|having)$/.test(tail)) return ["true"];
            // فهرستِ جای‌نگهدارِ IN — placeholders() این را می‌سازد.
            if (/\bin\s*\($/.test(tail)) return ["?"];
            // فهرستِ سطرهای یک INSERT چندردیفی که در زمان اجرا ساخته می‌شود.
            if (/\bvalues$/.test(tail)) return ["(?, ?, ?, ?, ?)", "(?)"];
            return ["", "where true"];
          };

          const dynamic = arg.templateSpans.some(
            (s) => !(ts.isIdentifier(s.expression) && constants.has(s.expression.text)),
          );

          let variants: string[] = [arg.head.text];
          for (const span of arg.templateSpans) {
            const expr = span.expression;
            const known =
              ts.isIdentifier(expr) && constants.has(expr.text) ? constants.get(expr.text)! : null;
            const next: string[] = [];
            for (const sofar of variants) {
              const options = known !== null ? [known] : fillFor(sofar);
              for (const opt of options) next.push(sofar + opt + span.literal.text);
            }
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

// ---------------------------------------------------------------------------
// الگوهای به‌جا مانده از PostgreSQL
// ---------------------------------------------------------------------------

/**
 * بعضی چیزها PREPARE می‌شوند ولی در MySQL معنای دیگری دارند — یعنی خطا
 * نمی‌دهند و بی‌صدا اشتباه کار می‌کنند. این‌ها را باید متنی گرفت.
 */
const LEFTOVERS: { re: RegExp; why: string }[] = [
  {
    re: /\$\d+/,
    why: "جای‌نگهدارِ $n مالِ PostgreSQL است؛ در MySQL باید ? باشد",
  },
  {
    re: /::\s*[a-z_]+(\[\])?/i,
    why: "cast با :: در MySQL نحو ندارد؛ CAST(x AS ...) لازم است",
  },
  {
    re: /\bilike\b/i,
    why: "ILIKE در MySQL وجود ندارد",
  },
  {
    re: /\bfilter\s*\(\s*where\b/i,
    why: "FILTER (WHERE …) در MySQL نیست؛ باید conditional aggregate شود",
  },
  {
    re: /\breturning\b/i,
    why: "RETURNING در MySQL نیست",
  },
  {
    re: /\bon\s+conflict\b/i,
    why: "ON CONFLICT در MySQL نیست؛ ON DUPLICATE KEY UPDATE",
  },
  {
    re: /\bnulls\s+(first|last)\b/i,
    why: "NULLS FIRST/LAST در MySQL نحو ندارد",
  },
  {
    re: /\b(make_interval|date_trunc|to_char|unnest|array_to_string|jsonb_\w+|array_agg|string_agg|gen_random_uuid|citext|coalesce\s*\(\s*array)/i,
    why: "تابعِ مخصوص PostgreSQL",
  },
  {
    re: /\|\|/,
    why:
      "در MySQL بدون PIPES_AS_CONCAT، عملگر || یعنی OR و نه الحاق — " +
      "بی‌صدا نتیجهٔ اشتباه می‌دهد. CONCAT() لازم است",
  },
  {
    re: /\bany\s*\(\s*\?/i,
    why: "ANY(آرایه) در MySQL نیست؛ IN با فهرست جای‌نگهدار",
  },
];

/**
 * کامنت‌های SQL قبل از بررسی حذف می‌شوند.
 *
 * ⚠️ بدون این، توضیحی که *دربارهٔ* یک الگوی PostgreSQL نوشته شده — مثلاً
 * «شرطِ اصلی $3::boolean بود» — خودش به‌عنوان الگوی باقی‌مانده گزارش
 * می‌شد. یعنی هرچه کد بهتر مستند می‌شد، ابزار بیشتر شکایت می‌کرد.
 */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/--(?:[ \t][^\n]*|(?=\n|$))/g, " ")
    .replace(/#[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

function scanLeftovers(sql: string): string[] {
  const body = stripSqlComments(sql);
  const out: string[] = [];
  for (const { re, why } of LEFTOVERS) if (re.test(body)) out.push(why);
  return out;
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ستون‌های اجباری که در INSERT جا افتاده‌اند
// ---------------------------------------------------------------------------

/**
 * ⚠️ این بررسی به‌خاطر یک باگ واقعی اضافه شد.
 *
 * در PostgreSQL ستون‌های UUID مقدار `default gen_random_uuid()` داشتند. در
 * MySQL چنین پیش‌فرضی وجود ندارد (تابع UUID() نسخهٔ ۱ است و قابل حدس)، پس
 * همه‌شان بدون DEFAULT ماندند و *برنامه* باید مقدار بدهد.
 *
 * `sessions.family_id` از قلم افتاد. نه tsc دیدش، نه PREPARE — چون هیچ‌کدام
 * «کدام ستون‌ها اجباری‌اند» را نمی‌سنجند. فقط در زمان اجرا با
 * «Field 'family_id' doesn't have a default value» بیرون زد، و آن هم چون
 * یکی از اسکریپت‌های بررسی اجرا شد.
 *
 * پس اینجا از خودِ کاتالوگ پرسیده می‌شود کدام ستون‌ها NOT NULL بدون DEFAULT
 * اند، و هر INSERT که یکی‌شان را ننویسد گزارش می‌شود.
 */
async function checkRequiredColumns(
  conn: mysql.Connection,
  statements: { file: string; line: number; sql: string }[],
): Promise<{ file: string; line: number; sql: string; error: string }[] > {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `select table_name as t, column_name as c
       from information_schema.columns
      where table_schema = database()
        and is_nullable = 'NO'
        and column_default is null
        and extra not like '%auto_increment%'
        and extra not like '%GENERATED%'`,
  );
  const required = new Map<string, string[]>();
  for (const r of rows) {
    const list = required.get(r.t) ?? [];
    list.push(r.c);
    required.set(r.t, list);
  }

  const out: { file: string; line: number; sql: string; error: string }[] = [];
  for (const q of statements) {
    const body = stripSqlComments(q.sql);
    // فقط شکلِ `insert into <table> (col, col, …)` — یعنی همان حالتی که
    // ستون‌ها صریح نوشته شده‌اند. `insert … select` و `insert … set` شکل
    // دیگری دارند و اینجا رد می‌شوند.
    const m = /insert\s+into\s+`?([a-z_]+)`?\s*\(([^)]*)\)/i.exec(body);
    if (!m) continue;

    const table = m[1].toLowerCase();
    const need = required.get(table);
    if (!need) continue;

    const written = new Set(
      m[2]
        .split(",")
        .map((c) => c.trim().replace(/^`|`$/g, "").toLowerCase())
        .filter(Boolean),
    );
    const missing = need.filter((c) => !written.has(c.toLowerCase()));
    if (missing.length) {
      out.push({
        ...q,
        error:
          `ستون‌های اجباریِ ${table} که نوشته نشده‌اند: ${missing.join("، ")} — ` +
          "NOT NULL اند و DEFAULT ندارند، پس در زمان اجرا رد می‌شوند.",
      });
    }
  }
  return out;
}



// ---------------------------------------------------------------------------
// قطعه‌های SQL که *بیرون* از کوئریِ اصلی ساخته می‌شوند
// ---------------------------------------------------------------------------

/**
 * ⚠️ این پاس به‌خاطر سه باگ واقعی اضافه شد، و علتِ نادیده ماندنشان مهم است.
 *
 * `scanLeftovers` روی متنِ همان template literal ای اجرا می‌شود که به
 * `query()` داده شده. ولی این سه فایل شرط‌هایشان را جای دیگری می‌ساختند:
 *
 *     conditions.push(`u.role = $${values.length}`);   // ← یک رشتهٔ جدا
 *     ...
 *     query(`select … ${where} …`, values);            // ← این اسکن می‌شد
 *
 * یعنی `$1` هرگز داخل رشته‌ای که اسکن می‌شد ظاهر نمی‌شد. کوئریِ بازسازی‌شده
 * هم بدون فیلتر ساخته می‌شود، پس در PREPARE هم مشکلی نشان نمی‌داد — و
 * `/admin/users` تازه روی هاست با «Undeclared variable: $1» می‌افتاد.
 *
 * پس این پاس روی **متنِ خامِ فایل** کار می‌کند و نه روی SQL استخراج‌شده. سه
 * الگو را می‌گیرد که هیچ‌کدام در MySQL معنا ندارند و هیچ‌کدام هم در کدِ
 * غیر-SQL به‌طور تصادفی پیش نمی‌آیند.
 */
const SOURCE_SMELLS: { re: RegExp; why: string }[] = [
  {
    // `$${values.length}` — اصطلاحِ ساختِ جای‌نگهدارِ شماره‌دارِ PostgreSQL.
    re: /\$\$\{/,
    why: "ساختِ جای‌نگهدارِ $n مالِ PostgreSQL است؛ در MySQL هر جای‌نگهدار ? است",
  },
  {
    re: /\bilike\b/i,
    why: "ILIKE در MySQL وجود ندارد؛ lower(x) like ? لازم است",
  },
  {
    re: /=\s*any\s*\(/i,
    why: "`= any(array)` نحوِ PostgreSQL است؛ در MySQL `in (?, ?, …)`",
  },
];

/**
 * کامنت‌های TypeScript حذف می‌شوند تا توضیحی که *دربارهٔ* این الگوها نوشته
 * شده، خودش گزارش نشود. (بدون این، هر کامنتی که تفاوت دو موتور را توضیح
 * می‌دهد ابزار را قرمز می‌کرد — یعنی مستندسازیِ خوب جریمه می‌شد.)
 */
function stripTsComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function scanSourceSmells(files: string[]): { file: string; line: number; why: string }[] {
  const hits: { file: string; line: number; why: string }[] = [];
  for (const file of files) {
    const lines = stripTsComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      for (const { re, why } of SOURCE_SMELLS) {
        if (re.test(line)) hits.push({ file, line: i + 1, why });
      }
    });
  }
  return hits;
}

async function main() {
  const files = [...walkTs("lib"), ...walkTs("app"), "proxy.ts"].filter(
    (f) => !SKIP.some((re) => re.test(f)),
  );

  for (const f of files) extract(f);

  // ⚠️ پیش از هر اتصالی: این پاس به دیتابیس نیاز ندارد و اگر چیزی پیدا کند،
  // ادامه دادن بی‌فایده است — کوئری‌های ساخته‌شده از آن قطعه‌ها به‌هرحال
  // در زمان اجرا می‌شکنند.
  const smells = scanSourceSmells(files);
  if (smells.length) {
    console.log(`\n${smells.length} قطعهٔ SQL با نحوِ PostgreSQL در کد مانده:\n`);
    for (const h of smells) console.log(`  ${h.file}:${h.line}\n    ${h.why}`);
    console.log("");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  const conn = await mysql.createConnection({ uri: url, multipleStatements: false });
  const failures: { file: string; line: number; sql: string; error: string }[] = [];
  let counter = 0;

  /** یک PREPARE. null یعنی موفق. */
  async function tryPrepare(sql: string): Promise<string | null> {
    const name = `sqlcheck_${counter++}`;
    try {
      // متنِ کوئری به‌عنوان پارامترِ PREPARE می‌رود، پس نقل‌قول‌ها دست‌کاری
      // نمی‌شوند. (نسخهٔ اول این ابزار متن را داخل رشته درج می‌کرد و هر
      // کوئریِ حاوی ' را خودش خراب می‌کرد.)
      await conn.query(`PREPARE \`${name}\` FROM ?`, [sql]);
      // ⚠️ آزاد کردن اجباری است: هر اتصال سقفی دارد
      // (max_prepared_stmt_count) و بدون این، اجرای ابزار روی پروژه‌ای با
      // چند صد کوئری به آن سقف می‌خورد.
      await conn.query(`DEALLOCATE PREPARE \`${name}\``);
      return null;
    } catch (e) {
      const err = e as { errno?: number; sqlMessage?: string };
      return `${err.errno ?? "?"}: ${err.sqlMessage ?? String(e)}`;
    }
  }

  for (const q of found) {
    const leftovers = scanLeftovers(q.sql);
    if (leftovers.length) {
      failures.push({ ...q, error: leftovers.join(" | ") });
      continue;
    }
    const error = await tryPrepare(q.sql);
    if (error) failures.push({ ...q, error });
  }

  // کوئریِ نیمه‌پویا: کافی است *یکی* از بازسازی‌ها بپذیرد. اگر هیچ‌کدام
  // نپذیرفت، ایراد در اسکلت است نه در حدسِ ما.
  for (const q of partial) {
    const leftovers = scanLeftovers(q.variants[0]);
    if (leftovers.length) {
      failures.push({ file: q.file, line: q.line, sql: q.variants[0], error: leftovers.join(" | ") });
      continue;
    }
    const errors: string[] = [];
    let anyOk = false;
    for (const v of q.variants) {
      const error = await tryPrepare(v);
      if (!error) {
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
        error: [...new Set(errors)].join(" | "),
      });
    }
  }

  // ستون‌های اجباریِ جامانده — روی همان دستورهای کامل.
  const requiredMisses = await checkRequiredColumns(conn, found);
  failures.push(...requiredMisses);

  await conn.end();

  console.log(
    `${found.length} دستور کامل و ${partial.length} دستور نیمه‌پویا بررسی شد` +
      ` (${found.length + partial.length} روی‌هم).`,
  );
  // ⚠️ صریح گفته می‌شود که پوشش کامل نیست: PREPARE شدنِ یک بازسازی به معنی
  // درستیِ همهٔ حالت‌های آن کوئری نیست، و کنسول SQL اصلاً اینجا نیست.
  console.log(
    `پوشش: کنسول SQL مدیر بررسی نمی‌شود (کوئری‌اش را کاربر می‌نویسد) و از ` +
      `کوئری‌های نیمه‌پویا فقط یک بازسازی سنجیده می‌شود.`,
  );

  if (failures.length === 0) {
    console.log("همه از دیدِ MySQL سالم‌اند.");
  } else {
    console.log(`\n${failures.length} دستور مشکل دارد:\n`);
    for (const f of failures) {
      console.log(`  ${f.file}:${f.line}`);
      console.log(`    ${f.error}`);
      console.log(`    ${f.sql.replace(/\s+/g, " ").slice(0, 160)}`);
      console.log();
    }
  }

  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
