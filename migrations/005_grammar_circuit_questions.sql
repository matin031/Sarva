-- =============================================================================
-- ۰۰۵ — مخزنِ پرسش‌های بازیِ «مدار دستور»
-- =============================================================================
--
-- تا امروز پرسش‌های این بازی دادهٔ نمایشیِ داخلِ باندل بودند
-- (`lib/grammar-circuit/demo-data.ts`) و صریحاً `isDemo: true` داشتند. این
-- migration جای واقعی‌شان را می‌سازد و بازی را به برنامهٔ درسی وصل می‌کند.
--
-- ── چرا `payload jsonb` و نه چند ستونِ رابطه‌ای ─────────────────────────────
-- یک پرسشِ «مدار دستور» یک درختِ کوچک است: فهرستِ توکن‌ها با جداکنندهٔ دقیقشان،
-- نقش‌های پذیرفته برای هر سوکت، فهرستِ قطعه‌ها، و ترتیبِ مدار. شکستنِ این‌ها به
-- چهار جدولِ فرزند یعنی چهار join برای خواندنِ چیزی که همیشه یکجا مصرف می‌شود
-- و هیچ‌وقت جداگانه کوئری نمی‌شود. مدلِ معتبرِ آن در TypeScript تعریف شده و
-- اعتبارسنجش (`validateGrammarCircuitQuestion`) هم آنجاست؛ دیتابیس متولیِ
-- *شکلِ* آن نیست.
--
-- ⚠️ و دقیقاً به همین دلیل: بودنِ یک ردیف در این جدول هیچ تضمینی نیست که
-- محتوایش از نظر آموزشی معتبر است. هر payload پیش از رسیدن به دانش‌آموز باید
-- از همان اعتبارسنجِ برنامه — شامل آزمونِ بن‌بست‌ناپذیری — رد شود. سرور همین
-- کار را می‌کند و ردیف‌های خراب را کنار می‌گذارد.
--
-- ── چرا `grade` رشته است و نه عددِ ۱۰/۱۱/۱۲ ────────────────────────────────
-- قراردادِ پروژه همین است: `vocab_words.grade` هم `dahom/yazdahom/davazdahom`
-- است و `lib/doroos` هم با همین کلیدها کار می‌کند. عددها فقط برای خواندنِ
-- آدمی‌اند و در لایهٔ نمایش ساخته می‌شوند.
--
-- ── چرا درس ۱..۱۸ و نه فهرستِ درس‌های «مجاز» ───────────────────────────────
-- درس‌های آزاد (۴ و ۱۵ در دهم، ۴ و ۱۳ در یازدهم، ۴ و ۱۵ در دوازدهم) امروز
-- محتوای این بازی را ندارند و در صفحهٔ انتخاب هم نمی‌آیند. ولی این یک تصمیمِ
-- *محصولی* است، نه یک حقیقتِ ابدیِ برنامهٔ درسی. اگر فردا برایشان محتوا ساخته
-- شد، نباید مجبور به تغییرِ اسکیما شویم. پس دیتابیس ۱ تا ۱۸ را می‌پذیرد و
-- صافیِ درس‌های آزاد در `lib/grammar-circuit/curriculum.ts` است.
--
-- ── چرا `is_published` ──────────────────────────────────────────────────────
-- در این پروژه RLS وجود ندارد و هر قاعدهٔ دسترسی در کدِ برنامه است. محتوایی که
-- هنوز آمادهٔ نمایش نیست باید در خودِ داده علامت داشته باشد و هر کوئریِ عمومی
-- شرطش را بگذارد؛ دیتابیس این را برایمان تضمین نمی‌کند.

create table grammar_circuit_questions (
  id uuid primary key default gen_random_uuid(),

  -- شناسهٔ ردیف در بستهٔ محتوایی مبدأ؛ مبنای ورودِ دوباره و مقایسه با فایل.
  -- متنی است نه عددی، چون شناسه‌های محتوا معمولاً معنادارند
  -- («gc-yazdahom-06-003») و مرتب‌کردنشان کارِ ما نیست.
  source_id text not null unique
    constraint grammar_circuit_questions_source_id_check
      check (length(btrim(source_id)) > 0),

  grade text not null
    constraint grammar_circuit_questions_grade_check
      check (grade in ('dahom', 'yazdahom', 'davazdahom')),

  lesson smallint not null
    constraint grammar_circuit_questions_lesson_check check (lesson between 1 and 18),

  -- جمله / مصراع / بیت
  question_type text not null default 'sentence'
    constraint grammar_circuit_questions_type_check
      check (question_type in ('sentence', 'hemistich', 'verse')),

  -- خودِ پرسش، هم‌شکلِ `GrammarCircuitQuestion`.
  payload jsonb not null
    constraint grammar_circuit_questions_payload_check
      check (jsonb_typeof(payload) = 'object'),

  difficulty smallint not null default 2
    constraint grammar_circuit_questions_difficulty_check check (difficulty between 1 and 3),

  -- توضیحِ پس از کامل‌شدنِ مدار.
  explanation text,
  -- مأخذِ بیت/جمله، اگر داشته باشد.
  attribution text,

  is_published boolean not null default false,
  sort_index integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- کوئریِ عمومی همیشه همین شکل است:
--   where is_published and grade = $1 and lesson = any($2) order by ...
-- ایندکس هم‌شکلِ همان بسته می‌شود تا پلن نه Seq Scan بگیرد نه Sort اضافه.
create index grammar_circuit_questions_public_idx
  on grammar_circuit_questions (is_published, grade, lesson, sort_index, source_id);

-- همان تابعِ مشترکِ ۰۰۱؛ ستون updated_at بدونِ تریگر هیچ‌وقت خودش تازه نمی‌شود.
create trigger grammar_circuit_questions_touch
  before update on grammar_circuit_questions
  for each row execute function touch_updated_at();
