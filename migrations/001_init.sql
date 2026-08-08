-- =============================================================================
-- سروا — اسکیمای پایه (جایگزین کامل ۱۴ migration دوران Supabase)
-- =============================================================================
-- این فایل عمداً «یک فایل» است، نه بازپخشِ تاریخچه. چون داده‌ای مهاجرت نمی‌کند،
-- بازپخشِ آن تاریخچه فقط ستون‌هایی را می‌ساخت که بلافاصله drop می‌شدند
-- (exam_questions.stimulus و exam_question_options.highlight_ranges) و کلی
-- policy و trigger که در معماری جدید بی‌معنی‌اند.
--
-- سه چیز از دنیای Supabase عمداً اینجا نیست:
--
--   ۱) RLS. تمام ۲۱ policy حذف شده. دلیل: RLS وقتی معنی دارد که کلاینت مستقیم
--      به دیتابیس وصل باشد (anon key در مرورگر). حالا تنها چیزی که به Postgres
--      وصل می‌شود خودِ سرور است، پس مرزِ امنیتی به لایهٔ اپلیکیشن منتقل شده —
--      همان الگویی که بانک آزمون از روز اول داشت (requireAdmin + deny-by-default).
--
--   ۲) نقش‌های anon/authenticated/service_role و همهٔ GRANT هایشان. یک نقش
--      داریم و آن هم صاحب دیتابیس است.
--
--   ۳) club_is_client_write() و دو گاردش. آن توابع داشتند از روی claim داخل JWT
--      حدس می‌زدند نوشتن از مرورگر آمده یا از سرور — سؤالی که دیگر وجود ندارد،
--      چون هر نوشتنی از سرور می‌آید. اعتبارسنجی‌شان به lib/repo/club.ts می‌رود.
--
-- تریگرهایی که مانده‌اند (شمارنده‌های کلاب و touch updated_at) امنیتی نیستند؛
-- کارشان درستیِ داده است و در Postgres ارزان‌تر و مطمئن‌تر از کد اجرا می‌شوند.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- =============================================================================
-- بخش ۱ — هویت و حساب کاربری
-- =============================================================================

-- جایگزین auth.users و profiles با هم.
--
-- در Supabase این دو جدا بودند چون auth.users مالِ GoTrue بود و دست‌نیافتنی؛
-- profiles فقط یک سایه بود که با تریگر on_auth_user_created پر می‌شد تا بشود
-- full_name و role را جایی نگه داشت. حالا که هر دو مال خودمان است، آن تفکیک
-- فقط یک JOIN اضافه در هر کوئری بود.
--
-- email از نوع citext است تا Ali@x.com و ali@x.com یک حساب باشند — در GoTrue
-- این رفتار توکار بود و اگر اینجا text می‌گذاشتیم، بی‌سروصدا از دست می‌رفت و
-- دو حساب موازی ساخته می‌شد.
create table users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  -- argon2id. هرگز plaintext، و هرگز به کلاینت فرستاده نمی‌شود.
  password_hash text not null,
  full_name text,
  role text not null default 'student'
    constraint users_role_check check (role in ('student', 'admin')),
  -- تا وقتی null است یعنی ایمیل تأیید نشده. ورود اجازه دارد ولی اپ می‌تواند
  -- محدودش کند؛ این ستون تنهاست تا سیاستش در کد قابل تغییر باشد نه در اسکیما.
  email_verified_at timestamptz,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- سشن‌های قابل‌ابطال.
--
-- اگر فقط JWT داشتیم، «مسدود کردن کاربر» تا انقضای توکن هیچ اثری نداشت. با این
-- جدول، access token کوتاه‌عمر (۱۵ دقیقه) می‌ماند ولی refresh token قابل باطل
-- کردن است — پس بن کردن حداکثر ۱۵ دقیقه طول می‌کشد تا کامل اثر کند، نه ۳۰ روز.
--
-- خودِ توکن ذخیره نمی‌شود، فقط هشش: یک دامپِ لو رفته نباید کلید ورود باشد.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_token_hash text not null unique,
  user_agent text,
  ip inet,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index sessions_user_idx on sessions (user_id, created_at desc);
-- برای جاروی دوره‌ایِ سشن‌های مرده
create index sessions_expires_idx on sessions (expires_at) where revoked_at is null;

-- کدهای یک‌بارمصرف ایمیل.
--
-- جایگزین otp_codes که سه مشکل داشت: کد را plaintext نگه می‌داشت، هیچ سقفی روی
-- تعداد تلاش نداشت، و روی email هیچ unique ای نداشت (پس آن upsert در
-- api/send-otp عملاً رفتار تعریف‌نشده داشت و ردیف‌ها روی هم تلنبار می‌شدند).
--
-- code_hash = HMAC-SHA256(code, OTP_PEPPER). چرا HMAC و نه bcrypt: کد فقط ۶ رقم
-- است، یعنی فضای جست‌وجو ۱۰⁶ — یک هشِ کند هم آن را نجات نمی‌دهد. چیزی که نجاتش
-- می‌دهد pepper است که در env می‌ماند و هرگز داخل دیتابیس نمی‌رود؛ بدون آن،
-- دامپِ لو رفته هیچ کدی را لو نمی‌دهد. ضمناً HMAC قطعی است پس lookup ممکن است.
create table email_otps (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  code_hash text not null,
  purpose text not null default 'signup_verify'
    constraint email_otps_purpose_check check (purpose in ('signup_verify', 'email_change')),
  expires_at timestamptz not null,
  -- سقف تلاش. وقتی به حد مجاز رسید کد می‌سوزد، حتی اگر منقضی نشده باشد.
  attempts smallint not null default 0,
  consumed_at timestamptz,
  -- برای rate-limit روی IP، نه برای نمایش
  requested_ip inet,
  created_at timestamptz not null default now()
);

-- هم برای پیدا کردن آخرین کدِ فعال، هم برای شمردن ارسال‌های اخیر (rate-limit)
create index email_otps_lookup_idx on email_otps (email, purpose, created_at desc);
create index email_otps_ip_idx on email_otps (requested_ip, created_at desc);

-- بازنشانی رمز.
--
-- در Supabase این کار با یک لینکِ حاوی سشنِ موقتِ GoTrue انجام می‌شد و صفحهٔ
-- /reset-password منتظر رویداد onAuthStateChange می‌ماند. اینجا یک توکن ساده و
-- یک‌بارمصرف است که در query string می‌آید — هیچ سشنی قبل از ست شدن رمز جدید
-- صادر نمی‌شود.
create table password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  requested_ip inet,
  created_at timestamptz not null default now()
);

create index password_resets_user_idx on password_resets (user_id, created_at desc);

-- تنظیماتی که ادمین از پنل عوض می‌کند و نباید در کد هاردکد باشند —
-- در وهلهٔ اول آدرس ایمیل فرستنده، که تا امروز 'noreply@aruzino.ir' بود و
-- برای عوض کردنش باید کد deploy می‌شد.
--
-- ترتیب حل مقدار در lib/settings: این جدول → متغیر env → خطا. یعنی سرور تازه
-- بدون هیچ ردیفی هم بالا می‌آید، و ادمین بعداً می‌تواند بدون deploy عوضش کند.
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id) on delete set null
);

-- لاگ پیامک. فعلاً هیچ فیچری پیامک نمی‌فرستد و آداپتر روی mock است؛ این جدول
-- هست تا وقتی پنل پیامک خریداری شد، «چه چیزی برای چه کسی رفت» از روز اول
-- قابل دیدن باشد و mock هم جایی برای نوشتن داشته باشد.
create table sms_log (
  id uuid primary key default gen_random_uuid(),
  to_number text not null,
  body text not null,
  provider text not null,
  status text not null default 'queued'
    constraint sms_log_status_check check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index sms_log_created_idx on sms_log (created_at desc);

-- =============================================================================
-- بخش ۲ — بانک آزمون
-- =============================================================================

-- ۱۸ مکانیزمِ اتمیکِ ورودی. هر مقدار دقیقاً به یک کامپوننت React نگاشت می‌شود.
-- پنج الگوی «ظرف» از کاتالوگ اینجا نیستند (multi-subquestion و بقیه)، چون یک
-- سؤال از آن شکل‌ها فقط چند ردیف exam_question_parts است که یک exam_questions
-- مشترک دارند — به exam_questions.layout_pattern نگاه کنید.
create type question_part_type as enum (
  'word-meaning-input',
  'mcq-inline',
  'mcq-multi-select',
  'mcq-plus-correction',
  'short-text-answer',
  'true-false',
  'multi-part-inline-tagging',
  'diagram-builder',
  'fill-blank-term',
  'two-answer-text',
  'word-reorder-dnd',
  'verse-completion',
  'matching-pairs-with-distractor',
  'count-answer',
  'paired-list-error-correction',
  'find-n-errors-in-list',
  'open-error-correction-in-passage',
  'mcq-select-line-in-poem'
);

-- نحوهٔ نمره‌دهی. هر چیزی جز exact_match امروز به needs_review می‌رسد و منتظر
-- تصحیح دستی می‌ماند (نمره‌دهی با هوش مصنوعی حذف شده). مقادیر ai_* عمداً مانده‌اند
-- چون محتوای تألیف‌شده به آن‌ها ارجاع دارد و معنی‌شان «این را ماشین نباید ببندد»
-- است، نه «این را حتماً یک LLM می‌بندد».
create type grading_mode as enum (
  'exact_match',
  'ai_semantic',
  'ai_partial_credit',
  'manual'
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  -- فعلاً متن ساده؛ وقتی درس دومی (عربی، دین‌وزندگی) واقعاً آمد نرمال می‌شود
  subject text not null,
  grade smallint not null,
  title text not null,
  -- کلید طبیعی که در URL می‌آید: 'kherdad-1403'
  exam_session text,
  total_score numeric(5,2) not null default 20,
  created_at timestamptz not null default now()
);

-- getExamByKey با همین ستون آزمون را پیدا می‌کند، پس باید هم ایندکس داشته باشد
-- هم یکتا باشد — وگرنه دو آزمون با یک exam_session یعنی maybeSingle() خطا می‌دهد.
create unique index exams_session_idx on exams (exam_session) where exam_session is not null;

create table exam_sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  title text not null,
  order_index smallint not null,
  -- جمعِ اعلام‌شده (۷ / ۵ / ۸). با sum(exam_question_parts.score) در کد
  -- مقابله می‌شود، نه با trigger — تریگرِ شکننده نمی‌خواهیم.
  section_score numeric(5,2) not null,
  unique (exam_id, order_index)
);

create table exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_section_id uuid not null references exam_sections(id) on delete cascade,
  number smallint not null,
  page_ref smallint,
  instruction text,
  layout_pattern text
    constraint exam_questions_layout_pattern_check check (
      layout_pattern is null or layout_pattern in (
        'multi-subquestion',
        'bracket-choice-mcq',
        'multi-item-true-false',
        'multi-paraphrase-block',
        'list-of-parallel-blanks'
      )
    ),
  order_index smallint not null,
  unique (exam_section_id, number)
);

create table exam_question_parts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references exam_questions(id) on delete cascade,
  part_index smallint not null default 0,
  label text,
  type question_part_type not null,
  -- numeric و نه float: نمرهٔ ۰.۲۵ باید ۰.۲۵ بماند
  score numeric(5,2) not null check (score > 0),
  -- شکلش به type بستگی دارد؛ با discriminated union زاد در
  -- lib/exam/content-schemas.ts اعتبارسنجی می‌شود
  content jsonb not null,
  correct_answer jsonb not null,
  accepted_answers jsonb,
  grading_mode grading_mode not null default 'exact_match',
  -- یادداشت تألیفی برای مصححِ انسانی
  ai_grading_hint text,
  unique (question_id, part_index)
);

create table exam_question_options (
  id uuid primary key default gen_random_uuid(),
  question_part_id uuid not null references exam_question_parts(id) on delete cascade,
  option_key text,
  order_index smallint not null,
  text text not null,
  is_correct boolean not null default false,
  unique (question_part_id, order_index)
);

create index exam_questions_section_idx on exam_questions (exam_section_id);
create index exam_question_parts_question_idx on exam_question_parts (question_id);
create index exam_question_options_part_idx on exam_question_options (question_part_id);

-- جمع نمرهٔ هر سؤال، برای مقابله با section_score و total_score
create view exam_question_totals as
  select
    q.id as question_id,
    q.exam_section_id,
    q.number,
    sum(qp.score) as total_score
  from exam_questions q
  join exam_question_parts qp on qp.question_id = q.id
  group by q.id, q.exam_section_id, q.number;

-- تلاشِ تمام‌شدهٔ دانش‌آموز. خودِ روند آزمون کلاینتی و روی localStorage است؛
-- این فقط ثبتِ بعد از واقعه است که یک بار در صفحهٔ نتیجه نوشته می‌شود.
create table exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  total_score numeric(6,2) not null,
  max_score numeric(6,2) not null,
  -- همان Record<questionNumber, QuestionResult> که ExamResults.tsx رندر می‌کند
  question_results jsonb not null,
  -- آنچه دانش‌آموز واقعاً نوشت، با کلید "questionNumber:partIndex"
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index exam_attempts_user_idx on exam_attempts (user_id, created_at desc);
create index exam_attempts_exam_idx on exam_attempts (exam_id);

-- =============================================================================
-- بخش ۳ — آزمون وزن شعر (کوییز)
-- =============================================================================
-- این چهار جدول هرگز migration نداشتند؛ مستقیم در SQL Editor ساخته شده بودند و
-- تنها ردّشان در repo دو فایل GRANT بود. ساختار زیر از خروجی information_schema
-- بازسازی شده، نه از روی حدس.

create table questions (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  -- بیت به‌صورت آرایهٔ مصراع‌ها
  poem text[],
  audio_url text,
  difficulty text not null default 'medium'
    constraint questions_difficulty_check check (difficulty in ('easy', 'medium', 'hard')),
  -- در Supabase این ستون timestamp without time zone بود. اینجا تصحیح شده:
  -- هر ستون زمانیِ دیگری در این اسکیما timestamptz است و یکی بودنشان مهم‌تر از
  -- وفاداری به یک اشتباهِ قدیمی است.
  created_at timestamptz not null default now()
);

create index questions_type_difficulty_idx on questions (type, difficulty);

create table question_options (
  id uuid primary key default gen_random_uuid(),
  -- در Supabase این nullable بود و بدون on delete. حالا not null + cascade:
  -- گزینهٔ بی‌سؤال معنی ندارد، و پاک کردن سؤال باید گزینه‌هایش را هم ببرد.
  question_id uuid not null references questions(id) on delete cascade,
  label text,
  poem text[],
  audio_url text,
  is_correct boolean not null default false,
  -- موقعیت افقی در چیدمان، پیش‌فرض ۳۰ (QuestionOption.tsx می‌خواندش)
  x integer not null default 30
);

create index question_options_question_idx on question_options (question_id);

-- آخرین پاسخ هر کاربر به هر سؤال. unique(user_id, question_id) یعنی پاسخ دوباره
-- به یک سؤال، بازنویسی است نه ردیف جدید — همان چیزی که Quiz.tsx با یک
-- select-then-update-or-insert شبیه‌سازی می‌کرد و حالا یک ON CONFLICT است.
create table user_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option_id uuid references question_options(id) on delete set null,
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index user_answers_user_idx on user_answers (user_id, answered_at desc);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  total integer not null,
  correct integer not null,
  created_at timestamptz not null default now()
);

create index quiz_attempts_user_idx on quiz_attempts (user_id, created_at desc);

create table quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option_id uuid references question_options(id) on delete set null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index quiz_attempt_answers_attempt_idx on quiz_attempt_answers (attempt_id);

-- =============================================================================
-- بخش ۴ — واژه‌یاب
-- =============================================================================

create table vocab_words (
  id uuid primary key default gen_random_uuid(),
  grade text not null
    constraint vocab_words_grade_check check (grade in ('dahom', 'yazdahom', 'davazdahom')),
  lesson smallint not null
    constraint vocab_words_lesson_check check (lesson between 1 and 18),
  word text not null,
  meaning text not null,
  -- لینک خارجی تصویر. امروز همه به raw.githubusercontent.com اشاره می‌کنند و از
  -- /api/vocab-image رد می‌شوند تا واترمارک بخورند. رشتهٔ آزاد می‌ماند تا آپلود
  -- روی سرور خودمان هم بعداً بدون تغییر اسکیما جا شود.
  image text not null default '',
  sort_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create index vocab_words_grade_lesson_idx on vocab_words (grade, lesson, sort_index);

-- پاسخ‌ها denormalize شده‌اند (word/meaning/image کپی می‌شوند) تا پنلِ کاربر
-- بدون JOIN کار کند و اگر واژه بعداً ویرایش یا حذف شد، تاریخچه همان چیزی را
-- نشان دهد که دانش‌آموز واقعاً دیده بود.
create table vocab_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  grade text not null,
  lesson smallint not null,
  word text not null,
  meaning text not null,
  image text not null default '',
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index vocab_answers_user_idx on vocab_answers (user_id, answered_at desc);

-- =============================================================================
-- بخش ۵ — جاسوسِ نقش‌ها
-- =============================================================================

create table jasoos_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  level_id integer not null,
  category text not null,
  verse_line_1 text not null,
  verse_line_2 text not null,
  chosen_role text not null,
  correct_role text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index jasoos_answers_user_idx on jasoos_answers (user_id, answered_at desc);

-- =============================================================================
-- بخش ۶ — نشان‌شده‌ها
-- =============================================================================

-- یک جدول برای همهٔ بخش‌های سایت. payload آن‌قدر اطلاعات دارد که پیش‌نمایش بدون
-- JOIN به منبع رندر شود — منبع ممکن است ویرایش یا حذف شود و نشان‌شده باید همان
-- چیزی را نشان دهد که دانش‌آموز دیده بود.
create table user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  area text not null
    constraint user_bookmarks_area_check check (area in ('aruz', 'vocab', 'exam', 'jasoos')),
  -- شکل کلید بین حوزه‌ها فرق دارد (uuid، شناسهٔ واژه، "examId:questionIndex")
  -- پس text است نه uuid
  ref_id text not null,
  title text not null,
  subtitle text,
  payload jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  -- نشان کردن دوباره یعنی toggle، نه ردیف دوم
  unique (user_id, area, ref_id)
);

create index user_bookmarks_user_idx on user_bookmarks (user_id, created_at desc);
create index user_bookmarks_user_area_idx on user_bookmarks (user_id, area, created_at desc);

-- =============================================================================
-- بخش ۷ — سروا کلاب
-- =============================================================================
-- قولِ این بخش این است که هیچ چیزی که بازدیدکننده می‌خواند از نظرِ انسان رد نشده
-- نباشد. در Supabase این قول در predicate یک RLS policy زندگی می‌کرد؛ حالا در
-- lib/repo/club.ts زندگی می‌کند. تفاوت مهم: آنجا یک فیلترِ فراموش‌شده هم بی‌خطر
-- بود، اینجا نیست. پس هر کوئریِ عمومیِ کلاب باید status='approved' داشته باشد و
-- تست‌های فاز ۵ دقیقاً همین را چک می‌کنند.

create table club_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- نامِ کنارِ شعر: full_name حساب در لحظهٔ ارسال، یا تخلص وقتی بی‌نام منتشر می‌شود
  author_name text not null,
  is_anonymous boolean not null default false,
  title text,
  body text not null
    constraint club_posts_body_len check (char_length(body) between 5 and 4000),
  form text not null default 'other'
    constraint club_posts_form_check check (form in (
      'ghazal', 'ghaside', 'masnavi', 'robaee', 'dobeyti',
      'chaharpare', 'ghete', 'nimaei', 'sepid', 'other'
    )),
  tags text[] not null default '{}'::text[],
  meter text,
  status text not null default 'pending'
    constraint club_posts_status_check check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  featured boolean not null default false,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  reviewed_at timestamptz,
  reviewed_by uuid references users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index club_posts_feed_idx on club_posts (status, featured desc, published_at desc);
create index club_posts_likes_idx on club_posts (status, like_count desc, published_at desc);
create index club_posts_user_idx on club_posts (user_id, created_at desc);
create index club_posts_status_idx on club_posts (status, created_at desc);
create index club_posts_tags_idx on club_posts using gin (tags);

create table club_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references club_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  -- برخلاف سروده، دیدگاه همیشه امضا دارد: نام خودِ حساب، هرگز تخلص
  author_name text not null,
  -- نخ دو سطح بیشتر نمی‌رود؛ اپ از nest کردن پاسخ زیر پاسخ خودداری می‌کند
  parent_id uuid references club_comments(id) on delete cascade,
  -- «در پاسخ به …» — شناسه است نه نام، تا کسی نتواند پاسخش را به اسم دیگری امضا
  -- کند. اگر آن دیدگاه حذف شد، ارجاع می‌افتد و پاسخ سر جایش می‌ماند.
  reply_to_id uuid references club_comments(id) on delete set null,
  body text not null
    constraint club_comments_body_len check (char_length(body) between 2 and 1500),
  status text not null default 'pending'
    constraint club_comments_status_check check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index club_comments_post_idx on club_comments (post_id, status, created_at);
create index club_comments_user_idx on club_comments (user_id, created_at desc);
create index club_comments_status_idx on club_comments (status, created_at desc);
create index club_comments_reply_to_idx on club_comments (reply_to_id);

create table club_likes (
  post_id uuid not null references club_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index club_likes_user_idx on club_likes (user_id);

create table club_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  target_type text not null
    constraint club_reports_target_check check (target_type in ('post', 'comment')),
  -- عمداً کلید خارجی نیست: گزارش باید از حذفِ چیزی که دربارهٔ آن است جان سالم
  -- به در ببرد، وگرنه لاگ دیگر توضیح نمی‌دهد چرا آن چیز رفت
  target_id uuid not null,
  reason text not null
    constraint club_reports_reason_check check (reason in ('plagiarism', 'offensive', 'spam', 'off_topic', 'other')),
  note text,
  status text not null default 'open'
    constraint club_reports_status_check check (status in ('open', 'resolved', 'dismissed')),
  resolved_at timestamptz,
  resolved_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- گزارش دوبارهٔ یک چیز، بی‌اثر است نه ردیف دوم در صف
  unique (reporter_id, target_type, target_id)
);

create index club_reports_status_idx on club_reports (status, created_at desc);

-- =============================================================================
-- بخش ۸ — تریگرها
-- =============================================================================
-- فقط چیزهایی که دربارهٔ درستیِ داده‌اند، نه دربارهٔ اینکه چه کسی اجازهٔ نوشتن دارد.

create function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_touch
  before update on users
  for each row execute function touch_updated_at();

create trigger club_posts_touch
  before update on club_posts
  for each row execute function touch_updated_at();

-- like_count و comment_count denormalize شده‌اند تا فید یک کوئری باشد نه یک
-- aggregate به ازای هر کارت. در دیتابیس نگه داشته می‌شوند چون شمردن در همان
-- تراکنشی که لایک درج می‌شود، از هر هماهنگیِ اپلیکیشنی مصون است.
create function club_sync_like_count()
returns trigger
language plpgsql
as $$
begin
  update club_posts p
     set like_count = (select count(*) from club_likes l where l.post_id = p.id)
   where p.id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;

create trigger club_likes_count
  after insert or delete on club_likes
  for each row execute function club_sync_like_count();

-- فقط دیدگاه‌های تأییدشده شمرده می‌شوند: عددِ زیر شعر باید با تعداد دیدگاهی که
-- بازدیدکننده واقعاً می‌تواند بخواند یکی باشد.
create function club_sync_comment_count()
returns trigger
language plpgsql
as $$
begin
  update club_posts p
     set comment_count = (
           select count(*) from club_comments c
            where c.post_id = p.id and c.status = 'approved'
         )
   where p.id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;

create trigger club_comments_count
  after insert or update or delete on club_comments
  for each row execute function club_sync_comment_count();
