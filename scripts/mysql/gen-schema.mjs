#!/usr/bin/env node
/**
 * ساختِ اسکیمای MySQL از روی کاتالوگ زندهٔ PostgreSQL.
 *
 *     SOURCE_POSTGRES_URL=postgres://... node scripts/mysql/gen-schema.mjs \
 *       --out mysql-migrations/001_init.sql \
 *       --manifest docs/mysql-schema-manifest.md
 *
 * چرا مولد و نه DDL دست‌نویس: ۳۹ جدول و ۳۴۵ ستون و ۴۰ کلید خارجی و ۶۳ index
 * را نمی‌شود دستی نوشت و مطمئن بود چیزی جا نمانده. مولد از کاتالوگ می‌خواند،
 * پس «جا ماندن» ممکن نیست؛ و هر نوعی که نگاشت نداشته باشد خطا می‌دهد به‌جای
 * اینکه بی‌صدا رد شود.
 *
 * خروجی یک فایل SQL ثابت است که در مخزن commit می‌شود. مولد ابزارِ ساختِ آن
 * است، نه چیزی که در زمان استقرار اجرا شود — استقرار همان فایل را می‌خواند.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";
import {
  mysqlType,
  mysqlDefault,
  indexBytes,
  TABLE_ORDER,
  TEXT_COLLATION,
} from "./type-map.mjs";
import {
  GENERATED_COLUMNS,
  INDEX_OVERRIDES,
  AUTO_INCREMENT_START,
  DROP_DEFAULT,
} from "./index-overrides.mjs";

// ---------------------------------------------------------------------------

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const OUT = arg("out", "mysql-migrations/001_init.sql");
const MANIFEST = arg("manifest", "docs/mysql-schema-manifest.md");

const SOURCE = process.env.SOURCE_POSTGRES_URL;
if (!SOURCE) {
  console.error("SOURCE_POSTGRES_URL لازم است — کاتالوگ از دیتابیس زنده خوانده می‌شود.");
  process.exit(1);
}

const q = (id) => `\`${id.replace(/`/g, "``")}\``;

// ---------------------------------------------------------------------------
// خواندن کاتالوگ
// ---------------------------------------------------------------------------

async function readCatalog(client) {
  const enums = new Map();
  for (const r of (
    await client.query(`
      select t.typname, e.enumlabel, e.enumsortorder
      from pg_type t join pg_enum e on e.enumtypid = t.oid
      order by t.typname, e.enumsortorder`)
  ).rows) {
    if (!enums.has(r.typname)) enums.set(r.typname, []);
    enums.get(r.typname).push(r.enumlabel);
  }

  const columns = (
    await client.query(`
      select c.relname as table_name, a.attname as column_name, a.attnum,
             format_type(a.atttypid, a.atttypmod) as pg_type,
             a.attnotnull as not_null,
             pg_get_expr(d.adbin, d.adrelid) as default_expr,
             a.attidentity::text as identity
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public' and c.relkind = 'r'
        and a.attnum > 0 and not a.attisdropped
      order by c.relname, a.attnum`)
  ).rows;

  const constraints = (
    await client.query(`
      select c.relname as table_name, con.conname, con.contype::text as contype,
             pg_get_constraintdef(con.oid) as def
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
      order by c.relname, con.conname`)
  ).rows;

  const indexes = (
    await client.query(`
      select tablename as table_name, indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
        and indexname not in (select conname from pg_constraint)
      order by tablename, indexname`)
  ).rows;

  return { enums, columns, constraints, indexes };
}

// ---------------------------------------------------------------------------
// ترجمهٔ CHECK
// ---------------------------------------------------------------------------

/**
 * CHECK های Postgres را به شکل MySQL درمی‌آورد.
 *
 * عمداً یک مترجمِ عمومیِ SQL نیست: فقط الگوهایی را می‌شناسد که واقعاً در این
 * اسکیما هست، و هر چیز دیگری خطا می‌دهد. یک مترجم regex ای که «تا جایی که
 * می‌تواند» ترجمه کند، دقیقاً همان چیزی است که یک CHECK را بی‌صدا ضعیف می‌کند.
 */
function translateCheck(def, tableName) {
  let s = def.replace(/^CHECK\s*\(\((.*)\)\)$/s, "$1").trim();

  // x = ANY (ARRAY['a'::text, 'b'::text])  →  x IN ('a','b')
  s = s.replace(
    /\(?([a-z_]+)\)?\s*=\s*ANY\s*\(\s*\(?ARRAY\[(.*?)\]\)?(?:::text\[\])?\s*\)/gs,
    (_m, col, list) => {
      const values = list
        .split(",")
        .map((v) => v.trim().replace(/::[a-z ]+$/i, "").trim());
      return `${q(col)} IN (${values.join(", ")})`;
    },
  );

  // char_length(x) → CHAR_LENGTH(x)
  //
  // ⚠️ هرگز LENGTH: در MySQL، LENGTH بایت می‌شمارد. یک بیت فارسی دو بایت به
  // ازای هر نویسه دارد، پس قیدِ «حداکثر ۴۰۰۰ نویسه» عملاً می‌شد ۲۰۰۰ نویسه و
  // نوشته‌های بلند کاربران بی‌دلیل رد می‌شدند.
  s = s.replace(/\bchar_length\s*\(/g, "CHAR_LENGTH(");
  // length(btrim(x)) هم روی متن است و باید نویسه بشمارد
  s = s.replace(/\blength\s*\(/g, "CHAR_LENGTH(");
  s = s.replace(/\bbtrim\s*\(/g, "TRIM(");

  // jsonb_typeof(payload) = 'object' → JSON_TYPE(payload) = 'OBJECT'
  s = s.replace(/\bjsonb_typeof\s*\(\s*([a-z_]+)\s*\)/g, "JSON_TYPE($1)");
  s = s.replace(/JSON_TYPE\(([a-z_]+)\)\s*=\s*'object'::text/g, "JSON_TYPE($1) = 'OBJECT'");
  s = s.replace(/JSON_TYPE\(([a-z_]+)\)\s*=\s*'object'/g, "JSON_TYPE($1) = 'OBJECT'");

  // cast های باقی‌مانده
  s = s.replace(/::text\b/g, "");
  s = s.replace(/\(0\)::numeric/g, "0");
  s = s.replace(/::numeric\b/g, "");

  if (/::/.test(s)) {
    throw new Error(`CHECK با cast ترجمه‌نشده در ${tableName}: ${def}`);
  }
  if (/\bANY\b|\bARRAY\b/.test(s)) {
    throw new Error(`CHECK با ANY/ARRAY ترجمه‌نشده در ${tableName}: ${def}`);
  }
  return `(${s})`;
}

// ---------------------------------------------------------------------------
// ترجمهٔ index ساده
// ---------------------------------------------------------------------------

function translateIndex(indexname, indexdef) {
  if (INDEX_OVERRIDES[indexname]) return INDEX_OVERRIDES[indexname];

  if (/\bWHERE\b/i.test(indexdef)) {
    throw new Error(
      `partial index بدون override: ${indexname}\n  ${indexdef}\n` +
        `  یک معادل صریح در scripts/mysql/index-overrides.mjs بنویس.`,
    );
  }
  if (/USING gin|USING gist|USING hash/i.test(indexdef)) {
    throw new Error(`index غیر-btree بدون override: ${indexname}`);
  }

  const unique = /CREATE UNIQUE INDEX/i.test(indexdef);
  const cols = /USING btree \((.*)\)$/is.exec(indexdef);
  if (!cols) throw new Error(`نتوانستم ستون‌های index را بخوانم: ${indexdef}`);

  const parts = splitTopLevel(cols[1]).map((raw) => {
    const t = raw.trim();
    const m = /^([a-z_]+)(\s+DESC)?(\s+NULLS\s+(FIRST|LAST))?$/i.exec(t);
    if (!m) throw new Error(`عبارت index پشتیبانی‌نشده در ${indexname}: ${t}`);
    if (m[3]) {
      throw new Error(
        `NULLS ${m[4]} در ${indexname} — MySQL این را در index بیان نمی‌کند؛ ` +
          `override لازم است.`,
      );
    }
    return `${q(m[1])}${m[2] ? " DESC" : ""}`;
  });

  return `${unique ? "UNIQUE KEY" : "KEY"} ${q(indexname)} (${parts.join(", ")})`;
}

/** split روی کاما، بدون شکستن داخل پرانتز. */
function splitTopLevel(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// ---------------------------------------------------------------------------
// ترجمهٔ FK
// ---------------------------------------------------------------------------

function translateForeignKey(conname, def) {
  const m =
    /FOREIGN KEY \((.*?)\) REFERENCES ([a-z_]+)\((.*?)\)(?:\s+ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION))?/i.exec(
      def,
    );
  if (!m) throw new Error(`FK ناخوانا: ${def}`);
  const cols = m[1].split(",").map((c) => q(c.trim())).join(", ");
  const refCols = m[3].split(",").map((c) => q(c.trim())).join(", ");
  const onDelete = m[4] ? ` ON DELETE ${m[4].toUpperCase()}` : "";
  return `CONSTRAINT ${q(conname)} FOREIGN KEY (${cols}) REFERENCES ${q(m[2])} (${refCols})${onDelete}`;
}

// ---------------------------------------------------------------------------
// ساخت
// ---------------------------------------------------------------------------

async function main() {
  const client = new pg.Client({ connectionString: SOURCE });
  await client.connect();
  const cat = await readCatalog(client);
  await client.end();

  const tables = [...new Set(cat.columns.map((c) => c.table_name))];
  const missing = tables.filter(
    (t) => !TABLE_ORDER.includes(t) && t !== "schema_migrations",
  );
  if (missing.length) {
    throw new Error(
      `جدولِ ناشناخته در مبدأ که در TABLE_ORDER نیست: ${missing.join(", ")}\n` +
        `  یا جدول تازه‌ای اضافه شده یا چیزی خارج از migration ها ساخته شده. ` +
        `بی‌صدا رد نمی‌شود.`,
    );
  }
  // schema_migrations مالِ اجراکننده است و در TABLE_ORDER نیست (بالا از
  // بررسیِ «جدول ناشناخته» مستثنا شده).
  const absent = TABLE_ORDER.filter((t) => !tables.includes(t));
  if (absent.length) throw new Error(`جدولِ TABLE_ORDER که در مبدأ نیست: ${absent.join(", ")}`);

  // کدام ستون‌ها در index/قید شرکت دارند؟ (برای تصمیم VARCHAR در برابر TEXT)
  const indexedCols = new Set();
  for (const c of cat.constraints) {
    if (c.contype === "c") continue;
    for (const m of c.def.matchAll(/\(([^)]*)\)/g)) {
      for (const col of m[1].split(",")) {
        indexedCols.add(`${c.table_name}.${col.trim()}`);
      }
    }
  }
  for (const i of cat.indexes) {
    const cols = /\((.*)\)/s.exec(i.indexdef.replace(/ WHERE .*$/is, ""));
    if (!cols) continue;
    for (const raw of splitTopLevel(cols[1])) {
      const name = /^\s*([a-z_]+)/.exec(raw);
      if (name) indexedCols.add(`${i.table_name}.${name[1]}`);
    }
  }

  const manifestRows = [];
  const uuidNoDefault = [];
  const droppedDefaults = [];
  const out = [];

  out.push(header());

  for (const table of TABLE_ORDER) {
    const cols = cat.columns.filter((c) => c.table_name === table);
    const cons = cat.constraints.filter((c) => c.table_name === table);
    const idxs = cat.indexes.filter((i) => i.table_name === table);

    const lines = [];

    for (const c of cols) {
      const key = `${table}.${c.column_name}`;
      const type = mysqlType(
        table,
        c.column_name,
        c.pg_type,
        indexedCols.has(key),
        cat.enums,
        Boolean(c.default_expr) && !/gen_random_uuid/.test(c.default_expr),
      );

      let line = `  ${q(c.column_name)} ${type}`;
      if (c.not_null) line += " NOT NULL";
      else line += " NULL";

      if (c.identity) {
        line += " AUTO_INCREMENT";
      } else if (DROP_DEFAULT.has(key)) {
        // دلیلش در scripts/mysql/index-overrides.mjs کنار DROP_DEFAULT است.
        droppedDefaults.push(key);
      } else {
        const def = mysqlDefault(table, c.column_name, c.default_expr, type);
        if (def !== null) line += ` DEFAULT ${def}`;
        else if (/gen_random_uuid/.test(c.default_expr ?? "")) uuidNoDefault.push(key);
      }
      lines.push(line);

      manifestRows.push({
        table,
        column: c.column_name,
        pg: c.pg_type + (c.not_null ? " NOT NULL" : "") ,
        my: type,
        pgDefault: c.default_expr ?? "—",
        myDefault: c.identity
          ? "AUTO_INCREMENT"
          : DROP_DEFAULT.has(key)
            ? "⚠️ عمداً حذف شد"
            : (mysqlDefault(table, c.column_name, c.default_expr, type) ??
               (/gen_random_uuid/.test(c.default_expr ?? "") ? "⚠️ اپ می‌سازد" : "—")),
      });
    }

    for (const g of GENERATED_COLUMNS[table] ?? []) {
      lines.push(`  ${q(g.name)} ${g.definition}`);
      manifestRows.push({
        table,
        column: g.name,
        pg: "— (ستون محاسباتی، در مبدأ نیست)",
        my: g.definition,
        pgDefault: "—",
        myDefault: "—",
      });
    }

    // PK
    const pk = cons.find((c) => c.contype === "p");
    if (pk) {
      const m = /PRIMARY KEY \((.*)\)/is.exec(pk.def);
      lines.push(
        `  PRIMARY KEY (${m[1].split(",").map((c) => q(c.trim())).join(", ")})`,
      );
    }

    // UNIQUE
    for (const c of cons.filter((x) => x.contype === "u")) {
      const m = /UNIQUE \((.*)\)/is.exec(c.def);
      lines.push(
        `  UNIQUE KEY ${q(c.conname)} (${m[1].split(",").map((x) => q(x.trim())).join(", ")})`,
      );
    }

    // index ها
    for (const i of idxs) lines.push(`  ${translateIndex(i.indexname, i.indexdef)}`);

    // CHECK
    for (const c of cons.filter((x) => x.contype === "c")) {
      lines.push(`  CONSTRAINT ${q(c.conname)} CHECK ${translateCheck(c.def, table)}`);
    }

    // FK
    for (const c of cons.filter((x) => x.contype === "f")) {
      lines.push(`  ${translateForeignKey(c.conname, c.def)}`);
    }

    let options = `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${TEXT_COLLATION} ROW_FORMAT=DYNAMIC`;
    if (AUTO_INCREMENT_START[table]) {
      options = `AUTO_INCREMENT=${AUTO_INCREMENT_START[table]} ${options}`;
    }

    out.push(`CREATE TABLE ${q(table)} (\n${lines.join(",\n")}\n) ${options};\n`);

    checkIndexWidths(table, lines, cols, cat.enums, indexedCols);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, out.join("\n"));

  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, renderManifest(manifestRows, uuidNoDefault, droppedDefaults, cat));

  console.log(`[gen-schema] ${TABLE_ORDER.length} جدول → ${OUT}`);
  console.log(`[gen-schema] manifest ${manifestRows.length} ستون → ${MANIFEST}`);
  console.log(
    `[gen-schema] ${uuidNoDefault.length} ستون UUID بدون default — اپ باید مقدار بدهد.`,
  );
}

/** سقف ۳۰۷۲ بایتیِ index در InnoDB. بی‌صدا رد نمی‌شود. */
function checkIndexWidths(table, lines, cols, enums, indexedCols) {
  const typeOf = new Map();
  for (const c of cols) {
    typeOf.set(
      c.column_name,
      mysqlType(
        table,
        c.column_name,
        c.pg_type,
        indexedCols.has(`${table}.${c.column_name}`),
        enums,
        Boolean(c.default_expr) && !/gen_random_uuid/.test(c.default_expr),
      ),
    );
  }
  for (const line of lines) {
    const m = /^\s*(?:UNIQUE )?KEY `[^`]+` \((.*)\)$/.exec(line.trim());
    if (!m) continue;
    if (/CAST\(/i.test(m[1])) continue; // multi-valued
    let total = 0;
    for (const raw of splitTopLevel(m[1])) {
      const name = /`([^`]+)`/.exec(raw);
      if (!name) continue;
      const t = typeOf.get(name[1]);
      if (!t) continue; // ستون محاسباتی
      total += indexBytes(t);
    }
    if (total > 3072) {
      throw new Error(
        `index از سقف ۳۰۷۲ بایتِ InnoDB رد شد (${total}) در ${table}: ${line.trim()}`,
      );
    }
  }
}

function header() {
  return `-- =============================================================================
-- سروا — اسکیمای MySQL 8
-- =============================================================================
-- ⚠️ این فایل تولید شده است. دستی ویرایشش نکن.
--
--     SOURCE_POSTGRES_URL=... node scripts/mysql/gen-schema.mjs
--
-- منبع: کاتالوگ زندهٔ PostgreSQL بعد از اعمال migrations/001..014.
-- تصمیم‌های نگاشت در scripts/mysql/type-map.mjs و index-overrides.mjs اند و
-- جدول کامل ستون‌به‌ستون در docs/mysql-schema-manifest.md.
--
-- تریگرها، view و روتین‌ها در 002_functions_triggers.sql اند — نه اینجا، چون
-- MySQL برای CREATE TRIGGER و CREATE FUNCTION جداکنندهٔ دستور دیگری می‌خواهد.
-- =============================================================================

`;
}

function renderManifest(rows, uuidNoDefault, droppedDefaults, cat) {
  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table)) byTable.set(r.table, []);
    byTable.get(r.table).push(r);
  }

  let md = `# manifest نگاشت اسکیما — PostgreSQL → MySQL 8

⚠️ این فایل تولید شده است (\`scripts/mysql/gen-schema.mjs\`).

- جدول‌ها: **${byTable.size}**
- ستون‌ها: **${rows.length}**
- enum ها: ${[...cat.enums.entries()].map(([k, v]) => `\`${k}\` (${v.length} مقدار)`).join("، ")}

## ستون‌های UUID بدون DEFAULT

در Postgres این ستون‌ها \`gen_random_uuid()\` داشتند. MySQL معادلِ «UUID تصادفی
نسخهٔ ۴» به‌صورت DEFAULT ندارد (\`UUID()\` نسخهٔ ۱ است: مبتنی بر زمان و MAC، و
قابل حدس). پس هیچ DEFAULT ای گذاشته نشده و **اپ باید در هر INSERT شناسه بدهد**
— با \`crypto.randomUUID()\`.

${uuidNoDefault.map((c) => `- \`${c}\``).join("\n")}

## ستون‌هایی که DEFAULT شان عمداً حذف شد

${droppedDefaults.length ? droppedDefaults.map((c) => `- \`${c}\``).join("\n") : "— هیچ —"}

## جدول ستون‌به‌ستون

`;

  for (const [table, cols] of byTable) {
    md += `### \`${table}\`\n\n`;
    md += `| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |\n`;
    md += `|---|---|---|---|---|\n`;
    for (const c of cols) {
      md += `| \`${c.column}\` | \`${c.pg}\` | \`${c.my}\` | \`${c.pgDefault}\` | \`${c.myDefault}\` |\n`;
    }
    md += `\n`;
  }
  return md;
}

main().catch((err) => {
  console.error(`[gen-schema] ${err.message}`);
  process.exit(1);
});
