-- =============================================================================
-- ۰۱۷ — پاسخ‌های «شکار نقش‌ها»
-- =============================================================================
--
-- ── چرا جدولِ تازه و نه ستونی در `grammar_circuit_answers` ──────────────────
--
-- «شکار نقش‌ها» محتوایش را از همان `grammar_circuit_questions` می‌گیرد، پس
-- وسوسه‌انگیز بود که پاسخ‌هایش هم در همان جدول بنشینند و یک ستونِ `game`
-- تفکیکشان کند. رد شد، و دلیلش شکلِ خودِ پاسخ است:
--
--   • «مدارِ دستور»   → یک ردیف به‌ازای هر *سوکت*: «چه نقشی روی این واژه
--                       گذاشتی؟» — انتخاب از میانِ نقش‌ها.
--   • «شکار نقش‌ها»   → یک ردیف به‌ازای هر *دور*: «کدام واژه این نقش را
--                       دارد؟» — انتخاب از میانِ واژه‌ها.
--
-- یعنی `chosen_role_key` در این بازی اصلاً معنایی ندارد و `chosen_token_id`
-- در آن یکی. یک جدولِ مشترک یعنی چهار ستونِ همیشه-NULL و یک CHECK شرطی که
-- می‌گوید «اگر بازی این بود، این ستون‌ها پر باشند» — یعنی دقیقاً همان دو
-- جدول، ولی پنهان‌شده پشتِ یک نام.
--
-- و قاعدهٔ خودِ مخزن هم همین است: هر بازی جدولِ پاسخِ خودش را دارد
-- (`jasoos_answers`، `aruz_bridge_answers`، `vocab_answers`).
--
-- ⚠️ چیزی که **مشترک می‌ماند** نقشِ دستوری است و نه جدول: `role_key` همان
-- کلیدِ متعارفِ `lib/grammar-circuit/roles.ts` است، پس تحلیلِ
-- `lib/plus/analysis.ts` هر سه بازی را روی یک سطل جمع می‌کند. جداییِ جدول
-- هیچ ربطی به جداییِ تحلیل ندارد.
--
-- ── درستی سمتِ سرور ─────────────────────────────────────────────────────────
-- ⚠️ کلاینت فقط می‌گوید «کدام واژه را زدم». نقشِ هدف و پاسخِ درست هر دو
-- تابعِ خالصِ خودِ پرسش‌اند (`lib/role-hunt/round.ts`) و سرور همان تابع را
-- اجرا می‌کند. پس `is_correct` هیچ‌وقت از مرورگر نمی‌آید.


CREATE TABLE IF NOT EXISTS `role_hunt_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ کلیدِ یکتاییِ ثبت، ساختهٔ مرورگر و یکی به‌ازای هر دور.
  --
  -- بدونِ آن، سه چیزِ کاملاً عادی یک پاسخ را دو بار می‌شمردند: تلاشِ دوبارهٔ
  -- `fetch` وقتی شبکه لرزیده، دو بار اجرا شدنِ effect در حالتِ توسعه، و
  -- کلیکِ دومِ کاربری که فکر کرده چیزی ثبت نشده. تحلیلی که یک اشتباه را دو
  -- بار می‌شمارد، دقیقاً همان نقشی را «ضعیف‌ترین» نشان می‌دهد که کاربر
  -- بیشتر اتفاقی روی دکمه‌اش دوبار زده.
  --
  -- ⚠️ و این یک سنجهٔ امنیتی نیست: کسی که بخواهد می‌تواند هر بار شناسهٔ
  -- تازه بفرستد. جلوگیری از *تصادف* است، نه از *تقلب*؛ تقلب را صحت‌سنجیِ
  -- سمتِ سرور بی‌اثر می‌کند، نه این ستون.
  `round_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ SET NULL و نه CASCADE: حذفِ یک پرسش توسطِ مدیر نباید تاریخچهٔ تمرینِ
  -- دانش‌آموز را ناپدید کند. هر چیزی که تحلیل لازم دارد در همین ردیف
  -- snapshot شده.
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `grade` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `lesson` SMALLINT NULL,

  -- بُعدِ اصلیِ تحلیل: کلیدِ متعارفِ نقش (`subject`, `predicate`, …) و نه
  -- برچسبِ فارسی. برچسب‌ها عوض می‌شوند؛ کلیدها قراردادِ داده‌اند.
  `role_key` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- متنِ مصراع/بیت، برای «دفترِ اشتباه‌ها» بدونِ join.
  `verse` VARCHAR(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- شناسهٔ *رخداد* و نه متن: یک مصراع می‌تواند دو بار «بود» داشته باشد و
  -- آن دو، دو هدفِ متفاوت‌اند. متن هم کنارش می‌ماند تا گزارشِ خطا خوانا
  -- باشد، ولی هیچ مقایسه‌ای رویش انجام نمی‌شود.
  `correct_token_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `correct_token_text` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `chosen_token_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `chosen_token_text` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `is_correct` TINYINT(1) NOT NULL,

  `answered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),

  -- یک ردیف به‌ازای هر دورِ هر کاربر. تلاشِ دوباره با همان شناسه بی‌اثر است.
  UNIQUE KEY `role_hunt_answers_round_key` (`user_id`, `round_id`),

  KEY `role_hunt_answers_user_idx` (`user_id`, `answered_at` DESC),
  -- کوئریِ تحلیل: «ضعیف‌ترین نقش‌های این کاربر».
  KEY `role_hunt_answers_role_idx` (`user_id`, `role_key`, `answered_at` DESC),
  KEY `role_hunt_answers_question_idx` (`question_id`),

  CONSTRAINT `role_hunt_answers_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_hunt_answers_question_fk`
    FOREIGN KEY (`question_id`) REFERENCES `grammar_circuit_questions` (`id`) ON DELETE SET NULL,

  -- ⚠️ همان الگوی `aruz_bridge_answers_outcome_matches`: ستونِ مشتق و ستون‌های
  -- مبنا هرگز نباید از هم جدا بیفتند. اگر روزی کدی `is_correct` را جدا
  -- محاسبه کند و اشتباه کند، درج می‌شکند و نه اینکه بی‌صدا آمار را کج کند.
  CONSTRAINT `role_hunt_answers_correct_matches`
    CHECK ((`is_correct` = 1) = (`chosen_token_id` = `correct_token_id`)),

  CONSTRAINT `role_hunt_answers_lesson_check`
    CHECK (`lesson` IS NULL OR `lesson` BETWEEN 1 AND 18)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
