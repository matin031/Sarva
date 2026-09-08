/**
 * کوئری‌های درون‌نگریِ کنسول SQL مدیر.
 *
 * =============================================================================
 * ⚠️ چرا اینجا و نه در sql-console.ts
 * =============================================================================
 *
 * آن فایل `"use server"` است و در Next هر export از یک ماژول server-action
 * باید **تابعِ async** باشد. یک ثابتِ رشته‌ای آنجا فایل را نمی‌شکند و tsc هم
 * چیزی نمی‌گوید — ولی `next build` در مرحلهٔ جمع‌آوریِ دادهٔ صفحه با
 * «Failed to collect page data for /admin/sql» می‌افتد، بدون هیچ اشاره‌ای
 * به علت.
 *
 * =============================================================================
 * ⚠️ چرا اصلاً جدا شده‌اند
 * =============================================================================
 *
 * کوئریِ دوم زمانی `cc.table_name` می‌خواند — ستونی که
 * information_schema.check_constraints اصلاً ندارد (فقط CONSTRAINT_CATALOG،
 * CONSTRAINT_SCHEMA، CONSTRAINT_NAME و CHECK_CLAUSE). صفحهٔ /admin/sql با
 * خطای ۵۰۰ بالا نمی‌آمد و هیچ بررسی خودکاری نمی‌گرفتش:
 *
 *   • db:check-sql عمداً کنسول را رد می‌کند (کوئریِ کنسول را کاربر می‌نویسد)
 *   • db:check-snippets فقط الگوهای آمادهٔ کنسول را می‌سنجد
 *
 * یعنی کوئریِ درون‌نگریِ خودِ کنسول در هیچ‌کدام نبود. حالا که در ماژولِ
 * سادهٔ خودشان نشسته‌اند، db:check-snippets هر دو را با PREPARE می‌سنجد.
 */

export const SCHEMA_COLUMNS_SQL = `select
         t.table_name                                     as table_name,
         coalesce(t.table_rows, 0)                        as approx_rows,
         c.column_name                                    as column_name,
         c.column_type                                    as data_type,
         c.is_nullable = 'YES'                            as is_nullable,
         c.column_default                                 as column_default,
         c.column_key = 'PRI'                             as is_pk,
         k.referenced                                     as referenced
       from information_schema.tables t
       join information_schema.columns c
         on c.table_schema = t.table_schema and c.table_name = t.table_name
       left join (
         select table_schema, table_name, column_name,
                concat(referenced_table_name, '.', referenced_column_name) as referenced
           from information_schema.key_column_usage
          where referenced_table_name is not null
          group by table_schema, table_name, column_name,
                   referenced_table_name, referenced_column_name
       ) k
         on k.table_schema = c.table_schema
        and k.table_name = c.table_name
        and k.column_name = c.column_name
       where t.table_schema = database() and t.table_type = 'BASE TABLE'
       order by t.table_name, c.ordinal_position`;

export const SCHEMA_CONSTRAINTS_SQL = `select tc.table_name as table_name,
              cc.constraint_name as name,
              concat('CHECK ', cc.check_clause) as definition
         from information_schema.check_constraints cc
         join information_schema.table_constraints tc
           on tc.constraint_schema = cc.constraint_schema
          and tc.constraint_name = cc.constraint_name
        where cc.constraint_schema = database()
          and tc.constraint_type = 'CHECK'
       union all
       select tc.table_name,
              tc.constraint_name,
              concat('UNIQUE (', group_concat(kcu.column_name
                       order by kcu.ordinal_position separator ', '), ')')
         from information_schema.table_constraints tc
         join information_schema.key_column_usage kcu
           on kcu.constraint_schema = tc.constraint_schema
          and kcu.constraint_name = tc.constraint_name
          and kcu.table_name = tc.table_name
        where tc.table_schema = database() and tc.constraint_type = 'UNIQUE'
        group by tc.table_name, tc.constraint_name
        order by 1, 2`;

