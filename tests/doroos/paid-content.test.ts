import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import lesson5 from "@/lib/doroos/content/dahom-05";
import { extractAnalysis, toPublicLesson } from "@/lib/doroos/public";
import { AI_READY } from "@/lib/doroos/ai-catalog";

/**
 * بخشِ پولیِ درسنامه واقعاً پشتِ قفل است — نه فقط در ظاهر.
 *
 * ⚠️ چرا این آزمون وجود دارد: نقش‌ها و آرایه‌ها سه راهِ نشت داشتند و هر سه
 * پیش از این باز بودند:
 *   ۱. صفحهٔ درس کلِ `syntax`/`devices` را در HTML می‌فرستاد؛
 *   ۲. `lib/doroos/index.ts` (با نقشهٔ `import()`ِ همهٔ درس‌ها) از کامپوننت‌های
 *      کلاینت import می‌شد و bundler برای هر درس یک chunkِ عمومی می‌ساخت؛
 *   ۳. فایلِ هوشواره (`*-ai.ts`) مستقیم از کلاینت `import()` می‌شد.
 * «+» روی دکمه فقط نمایش را پنهان می‌کرد. این آزمون هر سه را می‌بندد.
 */

const ROOT = process.cwd();

describe("toPublicLesson", () => {
  const pub = toPublicLesson(lesson5);

  test("هیچ نقش یا آرایه‌ای در نسخهٔ عمومی نمی‌ماند", () => {
    assert.equal(pub.kind, "poem");
    if (pub.kind !== "poem") return;
    for (const b of pub.beyts) {
      assert.equal(b.syntax, undefined, `بیت ${b.n} هنوز syntax دارد`);
      assert.equal(b.devices, undefined, `بیت ${b.n} هنوز devices دارد`);
    }
    // سخت‌گیرانه‌تر از بالا: حتی به‌صورتِ رشته در JSONِ صفحه نیاید.
    const json = JSON.stringify(pub);
    assert.equal(json.includes('"syntax":['), false);
    assert.equal(json.includes('"devices":['), false);
  });

  test("ولی پرچمِ «وجود دارد» می‌ماند تا دکمه‌ها ساخته شوند", () => {
    if (pub.kind !== "poem" || lesson5.kind !== "poem") return;
    pub.beyts.forEach((b, i) => {
      const src = lesson5.beyts[i];
      assert.deepEqual(b.analysis, {
        syntax: !!src.syntax?.length,
        devices: !!src.devices?.length,
      });
    });
  });

  test("بخشِ رایگان دست‌نخورده است", () => {
    if (pub.kind !== "poem" || lesson5.kind !== "poem") return;
    assert.equal(pub.beyts[0].meaning, lesson5.beyts[0].meaning);
    assert.deepEqual(pub.beyts[0].literary, lesson5.beyts[0].literary);
  });
});

describe("extractAnalysis", () => {
  test("نقش‌ها به شمارهٔ بیت کلید می‌خورند", () => {
    const units = extractAnalysis(lesson5);
    if (lesson5.kind !== "poem") return;
    const first = lesson5.beyts[0];
    assert.deepEqual(units[first.n]?.syntax, first.syntax);
    assert.deepEqual(units[first.n]?.devices, first.devices);
  });

  test("برای هوشواره آرایه‌ها فرستاده نمی‌شوند", () => {
    const units = extractAnalysis(lesson5, { devices: false });
    for (const unit of Object.values(units)) assert.equal(unit.devices, undefined);
  });
});

describe("فهرستِ هوشواره", () => {
  const aiSource = readFileSync(join(ROOT, "lib/doroos/ai.ts"), "utf8");

  test("AI_READY و نقشهٔ AI_LESSONS در ai.ts یکی‌اند", () => {
    const fromLoaders = [...aiSource.matchAll(/content\/(\w+)-(\d+)-ai"/g)]
      .map(([, grade, n]) => `${grade}/${Number(n)}`)
      .sort();
    const fromCatalog = Object.entries(AI_READY)
      .flatMap(([grade, ns]) => (ns ?? []).map((n) => `${grade}/${n}`))
      .sort();
    assert.deepEqual(fromCatalog, fromLoaders);
  });

  test("هر درسِ هوشواره فایلش را دارد", () => {
    for (const [grade, ns] of Object.entries(AI_READY)) {
      for (const n of ns ?? []) {
        const file = join(ROOT, `lib/doroos/content/${grade}-${String(n).padStart(2, "0")}-ai.ts`);
        assert.ok(existsSync(file), `${relative(ROOT, file)} وجود ندارد`);
      }
    }
  });
});

/* ── نگهبانِ bundle ───────────────────────────────────────────────────── */

/** ماژول‌هایی که اگر به گرافِ یک فایلِ کلاینت برسند، تحلیلِ پولی chunkِ
 *  عمومی می‌شود. */
const FORBIDDEN = [
  /^lib\/doroos\/index\.ts$/,
  /^lib\/doroos\/ai\.ts$/,
  /^lib\/doroos\/content\//,
];

const EXT = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = join(dirname(from), spec);
  else return null; // بستهٔ npm
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXT) if (existsSync(base + ext)) return base + ext;
  return null;
}

function importsOf(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const specs = [
    ...src.matchAll(/(?:import|export)\s+(?:type\s+)?[^'"`]*?from\s+["']([^"']+)["']/g),
    ...src.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g),
    ...src.matchAll(/^\s*import\s+["']([^"']+)["']/gm),
  ]
    // import typeِ خالص در bundle اثری ندارد.
    .filter((m) => !/^(?:import|export)\s+type\s/.test(m[0]))
    .map((m) => m[1]);
  return specs.map((s) => resolveImport(file, s)).filter((f): f is string => !!f);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

test("هیچ فایلِ کلاینتی (مستقیم یا غیرمستقیم) به محتوای درس‌ها نمی‌رسد", () => {
  const clientRoots = ["app", "components", "lib"]
    .flatMap((d) => walk(join(ROOT, d)))
    .filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));

  const leaks: string[] = [];
  for (const root of clientRoots) {
    const seen = new Set<string>();
    const stack: { file: string; path: string[] }[] = [{ file: root, path: [] }];
    while (stack.length) {
      const { file, path } = stack.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (FORBIDDEN.some((rx) => rx.test(rel))) {
        leaks.push([...path, rel].join(" → "));
        continue;
      }
      for (const next of importsOf(file)) stack.push({ file: next, path: [...path, rel] });
    }
  }

  assert.deepEqual(leaks, [], `مسیرِ نشت:\n${leaks.join("\n")}`);
});
