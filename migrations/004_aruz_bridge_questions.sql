-- =============================================================================
-- ۰۰۴ — مخزنِ پرسش‌های بازیِ «پلِ وزن»
-- =============================================================================
--
-- تا امروز پرسش‌های این بازی دادهٔ نمایشیِ داخلِ باندل بودند
-- (`lib/aruz-bridge/questions.ts`) و صریحاً `isDemo: true` داشتند تا کسی آن‌ها
-- را محتوای تأییدشدهٔ سروا نگیرد. این migration جای واقعی‌شان را می‌سازد.
--
-- ── شکلِ داده ────────────────────────────────────────────────────────────────
-- بستهٔ محتوایی هر ردیف را به شکلِ «عبارت + گزینهٔ ۱ + گزینهٔ ۲ + شمارهٔ گزینهٔ
-- درست» می‌دهد. اینجا به «درست/نادرست» تبدیل می‌شود و نه «گزینهٔ ۱/۲»، چون
-- ترتیبِ نمایش کارِ دیتابیس نیست: خودِ بازی هنگامِ ساختنِ دور، جای چپ و راست را
-- یک بار قرعه می‌زند. اگر ترتیبِ مبدأ را نگه می‌داشتیم، یک ترتیبِ بی‌معنا را
-- تا لایهٔ نمایش حمل کرده بودیم که هیچ‌کس به آن نگاه نمی‌کند.
--
-- ── چرا `source_id` ─────────────────────────────────────────────────────────
-- شناسهٔ ردیف در فایلِ مبدأ. کلیدِ اصلی uuid است (قراردادِ پروژه)، ولی برای
-- ورودِ دوبارهٔ همان بسته — و برای اینکه بشود ردیفی را با فایل مقایسه کرد —
-- به یک کلیدِ پایدارِ خارجی نیاز داریم. `unique` بودنش همان چیزی است که
-- seed را idempotent می‌کند: اجرای دوباره به‌جای تکرارِ ردیف‌ها، به‌روزشان
-- می‌کند.
--
-- ── چرا `is_published` ──────────────────────────────────────────────────────
-- در این پروژه RLS وجود ندارد و هر قاعدهٔ دسترسی در کدِ برنامه است. پس محتوایی
-- که هنوز آمادهٔ نمایش نیست باید *در خودِ داده* علامت داشته باشد و هر کوئریِ
-- عمومی شرطش را بگذارد؛ دیتابیس این را برایمان تضمین نمی‌کند.
--
-- ── چرا `difficulty` در دیتابیس و نه در زمانِ اجرا ──────────────────────────
-- سختیِ یک پرسش از فاصلهٔ دو وزن می‌آید: «فعل» در برابر «فع‌لن» یک هجا فرق
-- دارد و سخت است، «فعل» در برابر «مستفعلن» آسان. این محاسبه به جدولِ ارکان
-- نیاز دارد و ثابت است، پس یک بار هنگامِ seed انجام می‌شود نه در هر درخواست.

create table aruz_bridge_questions (
  id uuid primary key default gen_random_uuid(),

  -- شناسهٔ ردیف در بستهٔ محتوایی مبدأ؛ مبنای ورودِ دوباره و مقایسه با فایل.
  source_id integer not null unique,

  -- واژه یا عبارتی که باید وزنش تشخیص داده شود.
  phrase text not null
    constraint aruz_bridge_questions_phrase_check check (length(btrim(phrase)) > 0),

  correct_pattern text not null
    constraint aruz_bridge_questions_correct_check check (length(btrim(correct_pattern)) > 0),
  wrong_pattern text not null
    constraint aruz_bridge_questions_wrong_check check (length(btrim(wrong_pattern)) > 0),

  -- دو گزینهٔ یکسان یعنی پرسشی که پاسخِ درست ندارد. جلویش همین‌جا گرفته می‌شود،
  -- نه در کدی که ممکن است یادش برود.
  constraint aruz_bridge_questions_options_differ
    check (correct_pattern <> wrong_pattern),

  difficulty smallint not null default 2
    constraint aruz_bridge_questions_difficulty_check check (difficulty between 1 and 3),

  -- توضیحِ اختیاریِ پس از پاسخ. صفحهٔ پایانِ بازی اگر باشد نشانش می‌دهد.
  explanation text,

  -- برای حالتِ شنیداریِ آینده: عبارت خوانده می‌شود و متن نمایش داده نمی‌شود.
  -- ستون از حالا هست تا افزودنِ آن مُد به تغییرِ اسکیما نیاز نداشته باشد.
  audio_url text,

  is_published boolean not null default true,
  sort_index integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- کوئریِ عمومی همیشه «منتشرشده‌ها، به ترتیبِ ثابت» است و گاهی با صافیِ سختی.
-- ایندکس دقیقاً هم‌شکلِ همان ترتیب بسته می‌شود تا پلن به Sort نیفتد.
create index aruz_bridge_questions_published_idx
  on aruz_bridge_questions (is_published, difficulty, sort_index, source_id);

-- همان تابعِ مشترکِ ۰۰۱؛ ستون updated_at بدونِ تریگر هیچ‌وقت خودش تازه نمی‌شود.
create trigger aruz_bridge_questions_touch
  before update on aruz_bridge_questions
  for each row execute function touch_updated_at();
