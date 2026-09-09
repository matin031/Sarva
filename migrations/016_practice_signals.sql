-- =============================================================================
-- ۰۱۶ — سیگنال‌های تمرین: «پلِ وزن» و «مدارِ دستور»
-- =============================================================================
--
-- ⚠️ چرا این migration بخشی از سروا پلاس است و نه یک کارِ جداگانه:
--
-- ارزشِ اصلیِ پلاس یک جملهٔ ساده است — «بدان چه چیزی را باید مرور کنی». آن
-- جمله فقط به اندازهٔ داده‌ای که پشتش است راست می‌گوید. تا امروز از چهار
-- تمرینی که وزن و نقشِ دستوری را می‌سنجند، فقط دوتایشان ردی از خودشان
-- می‌گذاشتند:
--
--   • عروضِ سماعی → `user_answers`      ✓ ثبت می‌شد
--   • جاسوس        → `jasoos_answers`    ✓ ثبت می‌شد
--   • پلِ وزن       → هیچ‌جا             ✗
--   • مدارِ دستور   → هیچ‌جا             ✗
--
-- یعنی دانش‌آموزی که دویست دور «پلِ وزن» بازی کرده و همیشه روی «مفاعیلن»
-- می‌افتد، در هر تحلیلی نامرئی بود. تحلیلی که نصفِ شواهد را ندیده، بدتر از
-- نداشتنِ تحلیل است: با اطمینان چیز اشتباهی پیشنهاد می‌دهد.
--
-- ── این دو جدول عمداً «پاسخ» ثبت می‌کنند، نه «امتیاز» ────────────────────────
-- نمرهٔ بازی و رکوردِ بازیکن اینجا نیستند. آنچه برای مرور لازم است این است که
-- «کدام وزن» و «کدام نقش» غلط زده شده — نه اینکه چند امتیاز گرفته. اگر امتیاز
-- هم اینجا می‌آمد، تغییرِ فرمولِ امتیازدهیِ بازی، تاریخچهٔ آموزشی را هم
-- بی‌معنی می‌کرد.
--
-- ── درستی از سمتِ سرور سنجیده می‌شود ────────────────────────────────────────
-- برخلاف `vocab_answers` (که گزینه‌هایش در مرورگر ساخته می‌شوند و سرور راهی
-- برای بازسنجی ندارد)، هر دو بازیِ اینجا مرجعِ سروری دارند:
--   • پلِ وزن → `aruz_bridge_questions.correct_pattern`
--   • مدار    → `grammar_circuit_questions.payload` (سوکت‌ها و نقش‌های پذیرفته)
-- پس route های ثبت، `is_correct` را از کلاینت نمی‌پذیرند و خودشان حساب
-- می‌کنند. تنها چیزی که از مرورگر می‌آید «چه چیزی را انتخاب کردم» است.
-- =============================================================================

-- =============================================================================
-- پلِ وزن
-- =============================================================================

create table aruz_bridge_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  -- ⚠️ set null و نه cascade: اگر مدیر یک پرسش را حذف کند، تاریخچهٔ تمرینِ
  -- دانش‌آموز نباید ناپدید شود. برای همین همه‌چیزِ لازمِ تحلیل (عبارت و وزنِ
  -- درست) به‌صورت snapshot در همین ردیف هست.
  question_id uuid references aruz_bridge_questions(id) on delete set null,

  phrase text not null,

  -- ⚠️ بُعدِ اصلیِ تحلیل. «دانش‌آموز در کدام وزن ضعیف است» یعنی گروه‌بندی روی
  -- همین ستون. برای همین snapshot است و نه join: وزنِ درستِ آن لحظه، حتی اگر
  -- بعداً ردیفِ پرسش اصلاح شود.
  correct_pattern text not null,

  -- null فقط وقتی که وقت تمام شده و بازیکن اصلاً انتخابی نکرده.
  chosen_pattern text,

  outcome text not null
    constraint aruz_bridge_answers_outcome_check
      check (outcome in ('correct', 'wrong', 'timeout')),

  -- ⚠️ ستونِ مشتق، ولی عمدی: کوئریِ تحلیل روی همین فیلتر می‌کند و نوشتنِ
  -- `outcome = 'correct'` در ده جای مختلف، ده فرصت برای فراموش‌کردنِ
  -- `timeout` است. constraint پایین تضمین می‌کند این دو هرگز از هم جدا
  -- نیفتند.
  is_correct boolean not null,

  difficulty smallint
    constraint aruz_bridge_answers_difficulty_check
      check (difficulty is null or difficulty between 1 and 3),

  answered_at timestamptz not null default now(),

  constraint aruz_bridge_answers_outcome_matches
    check (is_correct = (outcome = 'correct')),
  -- پاسخِ درست بدون انتخاب ممکن نیست؛ timeout با انتخاب هم بی‌معنی است.
  constraint aruz_bridge_answers_choice_matches
    check ((outcome = 'timeout') = (chosen_pattern is null))
);

create index aruz_bridge_answers_user_idx
  on aruz_bridge_answers (user_id, answered_at desc);

-- کوئریِ تحلیل: «ضعیف‌ترین وزن‌های این کاربر». بدون این ایندکس، هر بار کلِ
-- تاریخچهٔ کاربر اسکن می‌شد.
create index aruz_bridge_answers_weight_idx
  on aruz_bridge_answers (user_id, correct_pattern, answered_at desc);

-- =============================================================================
-- مدارِ دستور
-- =============================================================================

-- یک ردیف به‌ازای هر *سوکت* (نه هر سؤال): بازیکن در یک سؤال ممکن است «نهاد»
-- را درست بگذارد و «متمم» را غلط. اگر نتیجه در سطحِ سؤال ثبت می‌شد، دقیقاً
-- همان چیزی که تحلیل به آن نیاز دارد — «کدام نقش» — گم می‌شد.
create table grammar_circuit_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question_id uuid references grammar_circuit_questions(id) on delete set null,

  -- پایه و درس، برای پیشنهادِ «کدام درس را مرور کن».
  grade text,
  lesson smallint
    constraint grammar_circuit_answers_lesson_check
      check (lesson is null or lesson between 1 and 18),

  token_text text not null,

  -- ⚠️ بُعدِ اصلیِ تحلیل: کلیدِ نقشِ درست (`subject`, `object`, ...) و نه
  -- برچسبِ فارسی. برچسب‌ها در `lib/grammar-circuit/roles.ts` هر وقت لازم شد
  -- عوض می‌شوند؛ کلیدها قراردادِ داده‌اند.
  --
  -- اگر سوکت چند نقش را می‌پذیرد (منبع علمی هر دو را درست می‌داند)، اولین
  -- عضوِ فهرست به‌عنوان برچسبِ متعارفِ سطل انتخاب می‌شود و کلِ فهرست هم در
  -- `accepted_role_keys` می‌ماند تا تحلیل بتواند در صورت نیاز دقیق‌تر شود.
  role_key text not null,
  accepted_role_keys text[] not null default '{}',

  chosen_role_key text not null,

  is_correct boolean not null,

  answered_at timestamptz not null default now()
);

create index grammar_circuit_answers_user_idx
  on grammar_circuit_answers (user_id, answered_at desc);

create index grammar_circuit_answers_role_idx
  on grammar_circuit_answers (user_id, role_key, answered_at desc);
