-- =============================================================================
-- سروا — محتوای بازی‌ها در دیتابیس
-- =============================================================================
-- تا امروز محتوای سه بازی داخل کد بود: lib/literary-pairs.ts، lib/ninja-data.ts
-- و lib/jasoos-data.ts. یعنی اضافه کردن یک نویسنده یا یک بیت تازه به معنی
-- ویرایش سورس و یک deploy کامل بود — کاری که مدیرِ محتوا نمی‌تواند بکند.
--
-- این migration همان سه ساختار را به جدول تبدیل می‌کند، دقیقاً به همان شکلی که
-- واژه‌یاب از قبل داشت (ساختار در کد، محتوا در دیتابیس).
--
-- ⚠️ هیچ‌کدام از این جدول‌ها seed نمی‌شوند. تا وقتی جدول خالی باشد، بازی همان
-- دادهٔ ثابتِ داخل کد را نشان می‌دهد (fallback در lib/*-content.ts). یعنی این
-- migration به‌تنهایی هیچ رفتاری را عوض نمی‌کند و اولین ردیفی که مدیر اضافه
-- می‌کند، جای کل دادهٔ ثابت را می‌گیرد.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- جفت‌های ادبی (بازی حافظه)
-- ---------------------------------------------------------------------------
-- هر ردیف یک جفتِ «اثر ↔ پدیدآورنده» است، یعنی دقیقاً دو کارت روی صفحه.
--
-- محدودهٔ بازی «پایه + نوبت» است، نه «درس»: دانش‌آموز اول پایه‌اش را انتخاب
-- می‌کند و بعد نوبت دی (نیمهٔ اول کتاب) یا خرداد (نیمهٔ دوم) را — پس ستون‌ها
-- همان دو چیزند و ایندکس هم روی همان دو تاست.
create table memory_pairs (
  id uuid primary key default gen_random_uuid(),
  grade text not null
    constraint memory_pairs_grade_check check (grade in ('dahom', 'yazdahom', 'davazdahom')),
  -- 'dey' = آزمون دی (نیمهٔ اول کتاب)، 'khordad' = آزمون خرداد (نیمهٔ دوم)
  term text not null
    constraint memory_pairs_term_check check (term in ('dey', 'khordad')),
  work text not null,
  author text not null,
  sort_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create index memory_pairs_deck_idx on memory_pairs (grade, term, sort_index);

-- یک اثر دو بار در یک دسته یعنی دو کارتِ هم‌متن که بازیکن نمی‌تواند بینشان
-- تفاوتی ببیند — جفت کردن آن‌ها شانسی می‌شود، نه حافظه‌ای.
create unique index memory_pairs_unique_work on memory_pairs (grade, term, work);

-- ---------------------------------------------------------------------------
-- نینجای دستور زبان
-- ---------------------------------------------------------------------------
-- «نقش» (قید، صفت، حرف ربط…) و کلماتی که آن نقش را دارند. کلمه به نقش ارجاع
-- داده می‌شود، پس جابه‌جا کردن یک کلمه بین دو نقش فقط عوض کردن category_id است.
create table ninja_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  hint text not null default '',
  -- نقشِ غیرفعال در پنل می‌ماند ولی در صفحهٔ تنظیماتِ بازی انتخاب‌شدنی نیست؛
  -- جای «حذف کن تا بعداً دوباره بسازی» را می‌گیرد.
  enabled boolean not null default true,
  sort_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create table ninja_words (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references ninja_categories (id) on delete cascade,
  word text not null,
  sort_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create index ninja_words_category_idx on ninja_words (category_id, sort_index);

-- یک کلمهٔ تکراری در یک نقش یعنی یک کلمه که دو بار در هوا پرت می‌شود.
create unique index ninja_words_unique on ninja_words (category_id, word);

-- ---------------------------------------------------------------------------
-- جاسوسِ نقش‌ها
-- ---------------------------------------------------------------------------
-- هر سطح یک بیت (یا یک جملهٔ نثر) است با چهار مظنون؛ یکی از آن‌ها جاسوس است،
-- یعنی نقشی را ادعا می‌کند که در این بیت وجود ندارد.
--
-- ⚠️ شناسه عمداً integer است و نه uuid: جدول jasoos_answers از migration اول
-- ستون level_id integer دارد و ردیف‌های ثبت‌شدهٔ دانش‌آموزان به همان اشاره
-- می‌کنند. عوض کردن نوعِ آن یعنی از دست دادن پیوندِ تاریخچه.
--
-- شمارش از ۱۰۰۰ شروع می‌شود تا با شناسهٔ ۱ تا ۸ سطح‌های ثابتِ داخل کد قاطی
-- نشود؛ وگرنه یک ردیفِ قدیمیِ level_id = 3 معلوم نبود به کدام سطح اشاره دارد.
create table jasoos_levels (
  id integer primary key generated always as identity (start with 1000),
  title text not null,
  category text not null
    constraint jasoos_levels_category_check check (category in ('دستوری', 'آرایه')),
  -- 'poem' دو مصرع را زیر هم می‌چیند، 'prose' یک بندِ پیوسته — مستقل از category
  content_type text not null
    constraint jasoos_levels_content_type_check check (content_type in ('poem', 'prose')),
  verse_line_1 text not null,
  verse_line_2 text not null default '',
  -- سطحِ نیمه‌کاره نباید به دست دانش‌آموز برسد؛ منتشرنشده فقط در پنل دیده می‌شود.
  is_published boolean not null default true,
  sort_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create index jasoos_levels_order_idx on jasoos_levels (sort_index, id);

create table jasoos_suspects (
  id uuid primary key default gen_random_uuid(),
  level_id integer not null references jasoos_levels (id) on delete cascade,
  role text not null,
  is_spy boolean not null default false,
  evidence text not null,
  -- کلمهٔ همان بیت که این نقش را بازی می‌کند. برای جاسوس خالی است — دقیقاً
  -- چون چنین کلمه‌ای در بیت وجود ندارد.
  word_in_verse text not null default '',
  sort_index smallint not null default 0
);

create index jasoos_suspects_level_idx on jasoos_suspects (level_id, sort_index);

-- «چهار مظنون با دقیقاً یک جاسوس» در کد نگه داشته می‌شود (هر ذخیره، هر چهار
-- ردیف را با هم جایگزین می‌کند) — یک constraint سطحِ ردیف نمی‌تواند شرطی روی
-- کلِ گروه بگذارد. ولی همین ایندکس جلوی دو جاسوس در یک سطح را می‌گیرد.
create unique index jasoos_suspects_one_spy on jasoos_suspects (level_id) where is_spy;
