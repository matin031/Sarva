#!/usr/bin/env node
/**
 * تبدیلِ *فقط بخشِ مکانیکیِ* کوئری‌ها از PostgreSQL به MySQL.
 *
 *     node scripts/mysql/codemod-sql.mjs [--write]
 *
 * ⚠️ این ابزار «مترجم PostgreSQL→MySQL» نیست و نباید بشود. کارش دو تبدیلِ
 * کاملاً بی‌ابهام است و هر کوئری‌ای که چیزی فراتر از آن دو داشته باشد را
 * *دست‌نخورده* رها می‌کند و در گزارش می‌آورد تا دستی بازنویسی شود:
 *
 *   ۱) $1 $2 $3 …  →  ? ? ?      (فقط وقتی دقیقاً ۱..N و به ترتیب باشند)
 *   ۲) حذف cast های اسکالرِ بی‌اثر در MySQL (::text، ::uuid، ::int، …)
 *
 * چرا این مرزبندی:
 *
 *   • جای‌نگهدارِ $n شماره‌دار است و ? موقعیتی. اگر $2 قبل از $1 بیاید یا $1
 *     دو بار بیاید، تبدیلِ کورکورانه مقدارها را جابه‌جا می‌نشاند و کوئری
 *     *بدون هیچ خطایی* نتیجهٔ اشتباه می‌دهد. (در همین مخزن ۲۲ مورد داشت،
 *     از جمله `rotated_to = $2 … where id = $1`.)
 *
 *   • RETURNING و ON CONFLICT و FILTER و آرایه‌ها معادلِ یک‌به‌یک ندارند؛
 *     هرکدام یک تصمیم می‌خواهند، نه یک جایگزینی.
 *
 * درستیِ خروجی با scripts/check-sql.ts سنجیده می‌شود که هر دستور را به خودِ
 * MySQL می‌دهد. این ابزار جای آن بررسی را نمی‌گیرد.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const WRITE = process.argv.includes("--write");

const SQL_CALLS = new Set(["query", "queryOne", "execute", "insertId"]);
const SKIP_FILES = [
  /lib\/admin\/sql-console\.ts$/,
  /lib\/admin\/sql-constants\.ts$/,
  /scripts\//,
];

/**
 * هر چیزی که یعنی «این کوئری دستی است».
 * عمداً سخت‌گیرانه: یک تطبیقِ اضافه فقط یعنی کارِ دستیِ بیشتر، ولی یک تطبیقِ
 * جامانده یعنی کوئریِ خرابِ بی‌صدا.
 */
const NEEDS_HAND = [
  { re: /::\s*[a-z_ ]+\[\]/i, why: "cast آرایه" },
  { re: /::\s*interval/i, why: "::interval" },
  { re: /::\s*double\s+precision/i, why: "::double precision" },
  { re: /\breturning\b/i, why: "RETURNING" },
  { re: /\bon\s+conflict\b/i, why: "ON CONFLICT" },
  { re: /\bfilter\s*\(\s*where\b/i, why: "FILTER (WHERE …)" },
  { re: /\bnulls\s+(first|last)\b/i, why: "NULLS FIRST/LAST" },
  { re: /\bilike\b/i, why: "ILIKE" },
  { re: /\|\|/, why: "الحاق با ||" },
  { re: /\bhost\s*\(/i, why: "host(inet)" },
  {
    re: /\b(make_interval|date_trunc|to_char|unnest|array_agg|string_agg|array_to_string|jsonb_\w+|to_jsonb|gen_random_uuid|extract\s*\(\s*epoch)/i,
    why: "تابع مخصوص PostgreSQL",
  },
  { re: /\bany\s*\(/i, why: "ANY(…)" },
  { re: /\bdistinct\s+on\b/i, why: "DISTINCT ON" },
  { re: /\blateral\b/i, why: "LATERAL" },
];

/**
 * cast هایی که در MySQL بی‌اثرند و می‌شود حذفشان کرد.
 *
 * چرا حذف امن است: در PostgreSQL این‌ها بیشتر برای *معلوم کردنِ نوعِ
 * پارامتر* بودند (چون آنجا $1 بی‌نوع است و planner باید بداند). در MySQL
 * پارامترِ prepared نوعش را از مقداری که فرستاده می‌شود می‌گیرد، پس اعلامِ
 * نوع نه لازم است نه ممکن.
 *
 * و روی *عبارت‌ها* هم بی‌اثرند: `count(*)::int` در MySQL همان `count(*)` است
 * چون از قبل عدد صحیح است، و `(x is null)::int` هم از قبل ۰/۱ می‌دهد.
 *
 * ⚠️ cast های آرایه اینجا نیستند — آن‌ها بالا در NEEDS_HAND اند.
 */
const DROPPABLE_CASTS =
  /::\s*(text|citext|uuid|inet|date|jsonb|json|integer|int|int4|int8|smallint|bigint|boolean|bool|numeric|real|varchar)\b/gi;

function walkTs(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** $n ها دقیقاً ۱..N و به ترتیب و بدون تکرار؟ */
function isSequential(sql) {
  const nums = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  return nums.every((n, i) => n === i + 1);
}

const report = { converted: 0, nowFixed: 0, skipped: [], files: 0 };

for (const file of [...walkTs("lib"), ...walkTs("app"), "proxy.ts"].filter(
  (f) => !SKIP_FILES.some((re) => re.test(f)),
)) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

  /** ویرایش‌ها: {start, end, replacement} روی متنِ خام. */
  const edits = [];

  const walk = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : null;

      if (name && SQL_CALLS.has(name) && node.arguments.length > 0) {
        const arg = node.arguments[0];
        const isSql =
          ts.isNoSubstitutionTemplateLiteral(arg) ||
          ts.isStringLiteral(arg) ||
          ts.isTemplateExpression(arg);

        if (isSql) {
          const start = arg.getStart();
          const end = arg.getEnd();
          const raw = text.slice(start, end);
          const line = source.getLineAndCharacterOfPosition(start).line + 1;

          // ---------------------------------------------------------------
          // پاسِ صفر: now() → now(6)
          // ---------------------------------------------------------------
          // این یکی روی *همهٔ* کوئری‌ها اعمال می‌شود، حتی آن‌هایی که بقیهٔ
          // کارشان دستی است، چون بی‌ابهام است و جا انداختنش بی‌صدا خراب
          // می‌کند.
          //
          // در MySQL، now() دقتِ ثانیه دارد و ستون‌های ما DATETIME(6) اند.
          // یعنی `created_at = now()` میکروثانیه را صفر می‌نویسد و هر
          // ترتیبی که به created_at تکیه دارد — تاریخچهٔ پاسخ‌ها، فید کلاب،
          // گروه‌بندی نشست‌ها در پنل — ردیف‌های یک ثانیهٔ یکسان را
          // غیرقابل‌تفکیک می‌بیند.
          //
          // (در PostgreSQL این مشکل نبود: now() آنجا از اول میکروثانیه دارد.)
          let working = raw.replace(/\bnow\s*\(\s*\)/gi, "now(6)");
          if (working !== raw) {
            edits.push({ start, end, replacement: working });
            report.nowFixed++;
          }

          const hand = NEEDS_HAND.filter((h) => h.re.test(working)).map((h) => h.why);
          if (hand.length) {
            report.skipped.push({ file, line, why: hand.join("، ") });
          } else if (!isSequential(working)) {
            report.skipped.push({ file, line, why: "پارامترِ تکراری یا خارج از ترتیب" });
          } else if (/\$\d+/.test(working) || DROPPABLE_CASTS.test(working)) {
            DROPPABLE_CASTS.lastIndex = 0;
            const next = working.replace(/\$\d+/g, "?").replace(DROPPABLE_CASTS, "");
            DROPPABLE_CASTS.lastIndex = 0;
            if (next !== working) {
              // ویرایشِ پاسِ صفر روی همین بازه را کنار می‌گذاریم؛ این یکی
              // شاملش هم هست.
              if (edits.length && edits[edits.length - 1].start === start) edits.pop();
              edits.push({ start, end, replacement: next });
              report.converted++;
            }
          }
        }
      }
    }
    node.forEachChild(walk);
  };
  source.forEachChild(walk);

  if (edits.length && WRITE) {
    // از آخر به اول، تا موقعیت‌ها جابه‌جا نشوند.
    let out = text;
    for (const e of edits.sort((a, b) => b.start - a.start)) {
      out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
    }
    writeFileSync(file, out);
    report.files++;
  }
}

console.log(`${report.nowFixed} کوئری now() → now(6) شد.`);
console.log(
  `${report.converted} کوئری مکانیکی تبدیل شد` +
    (WRITE ? ` در ${report.files} فایل.` : " (خشک — برای نوشتن --write بده).") ,
);
console.log(`${report.skipped.length} کوئری دستی می‌خواهد:\n`);

const byReason = new Map();
for (const s of report.skipped) {
  if (!byReason.has(s.why)) byReason.set(s.why, []);
  byReason.get(s.why).push(`${s.file}:${s.line}`);
}
for (const [why, places] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${why} (${places.length})`);
  for (const p of places) console.log(`      ${p}`);
}
