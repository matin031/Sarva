#!/usr/bin/env node
/**
 * کدام کوئری‌ها را می‌شود مکانیکی از $n به ? برد، و کدام‌ها نه.
 *
 * ⚠️ چرا این بررسی لازم است و «همه را sed کن» جواب نمی‌دهد:
 *
 * در PostgreSQL جای‌نگهدارها *شماره‌دار* اند، پس ترتیبِ ظاهرشدنشان در متن
 * هیچ ربطی به ترتیبِ آرایهٔ پارامترها ندارد و یک پارامتر می‌تواند چند بار
 * بیاید:
 *
 *     where (email = $1 or name = $1) and created_at > $3 and id = $2
 *
 * در MySQL جای‌نگهدارها *موقعیتی* اند. تبدیلِ کورکورانهٔ بالا می‌شود
 * `email = ? or name = ? and created_at > ? and id = ?` که چهار پارامتر
 * می‌خواهد و آرایه سه‌تایی است — یا بدتر، اگر تعداد جور دربیاید، مقدارها
 * جابه‌جا می‌نشینند و کوئری بی‌هیچ خطایی نتیجهٔ اشتباه می‌دهد.
 *
 * پس فقط جایی مکانیکی امن است که $n ها دقیقاً به ترتیب ۱، ۲، ۳ … بیایند و
 * هیچ‌کدام تکرار نشوند. بقیه دستی بازنویسی می‌شوند و اینجا فهرست می‌شوند.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const SQL_CALLS = new Set(["query", "queryOne", "execute", "insertId"]);
const SKIP = [/lib\/admin\/sql-console\.ts$/, /lib\/admin\/sql-constants\.ts$/, /scripts\//];

function walkTs(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** آیا $n ها دقیقاً ۱..N و به ترتیب و بدون تکرارند؟ */
export function isSequential(sql) {
  const nums = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  if (nums.length === 0) return true;
  return nums.every((n, i) => n === i + 1);
}

const safe = [];
const unsafe = [];

for (const file of [...walkTs("lib"), ...walkTs("app"), "proxy.ts"].filter(
  (f) => !SKIP.some((re) => re.test(f)),
)) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

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
        // متنِ کلِ عبارت، شاملِ شکاف‌های ${…}: برای شمردنِ $n کافی است.
        const raw = arg.getText();
        const line = source.getLineAndCharacterOfPosition(arg.getStart()).line + 1;
        if (/\$\d+/.test(raw)) {
          (isSequential(raw) ? safe : unsafe).push({ file, line, raw });
        }
      }
    }
    node.forEachChild(walk);
  };
  source.forEachChild(walk);
}

console.log(`قابل تبدیل مکانیکی (پارامترها به ترتیب ۱..N): ${safe.length}`);
console.log(`نیازمند بازنویسی دستی (تکراری یا خارج از ترتیب): ${unsafe.length}\n`);
for (const u of unsafe) {
  const nums = [...u.raw.matchAll(/\$(\d+)/g)].map((m) => m[1]).join(",");
  console.log(`  ${u.file}:${u.line}`);
  console.log(`    ترتیب $n: ${nums}`);
  console.log(`    ${u.raw.replace(/\s+/g, " ").slice(0, 150)}`);
  console.log();
}
