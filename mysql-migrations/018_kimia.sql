-- =============================================================================
-- ۰۱۸ — دورهای «کیمیای وزن»
-- =============================================================================
--
-- ── چرا هیچ جدولِ *محتوایی* اینجا نیست ─────────────────────────────────────
--
-- «کیمیای وزن» بیت و وزنش را از بانکِ عروضِ سماعی می‌گیرد — همان
-- `questions` + `question_options` که از روزِ اول هست. در آن بانک، هر سؤالِ
-- `audio-to-poem` / `poem-to-audio` یک جفتِ تأییدشدهٔ (بیت، وزن) است و وزن
-- در نامِ فایلِ صوتی نوشته شده (`‎/audio/مفاعیلن-مفاعیلن-فعولن.mp3`).
--
-- ساختنِ جدولِ دومِ «بیت و ارکانش» یعنی دو بانکِ حقیقت که روزی از هم دور
-- می‌شوند، و آن روز هیچ‌کس نمی‌داند کدام درست است — دقیقاً همان دلیلی که
-- `lib/aruz/meters.ts` هم یک نسخه بیشتر ندارد. پس این migration فقط
-- *نتیجهٔ تمرین* را می‌سازد و نه محتوا را.
--
-- ── چرا «دور» و نه «پاسخ» ──────────────────────────────────────────────────
--
-- بقیهٔ بازی‌ها یک ردیف به‌ازای هر پاسخ می‌نویسند، چون در آن‌ها هر پاسخ یک
-- فرصت است و تمام. اینجا نه: بازیکن ترکیبش را می‌سازد، آزمایش می‌کند،
-- ناپایدار می‌شود، اصلاحش می‌کند و دوباره آزمایش می‌کند. همین *هدفِ* بازی
-- است.
--
-- ⚠️ اگر هر «آزمایش ترکیب» یک ردیف می‌شد، تحلیل خراب می‌شد و نه فقط شلوغ:
-- دانش‌آموزی که یک بیت را با سه تلاش درست ساخته، سه شاهد تولید می‌کرد که
-- دوتایش غلط است — یعنی همان تلاش کردن، در کارنامه‌اش به‌عنوان ضعف
-- می‌نشست. و بدتر، ضعفِ ساختگی روی وزنی ثبت می‌شد که *بلد شده بود*.
--
-- پس یک دور = یک ردیف = یک شاهد. تلاشِ اول شاهدِ یادگیری است
-- (`first_*`)، آخرین وضعیت نتیجهٔ نهایی (`last_*`)، و `attempts_count`
-- می‌گوید چند بار طول کشید. سه چیزِ متفاوت، سه ستونِ متفاوت، یک ردیف.
--
-- ── درستی سمتِ سرور ────────────────────────────────────────────────────────
-- ⚠️ `meter_ark` از دیتابیس می‌آید و نه از مرورگر: سرور پرسش را با شناسه‌اش
-- می‌خواند، ارکانِ متعارف را از نامِ فایلِ صوتی درمی‌آورد و خودش می‌سنجد.
-- بدنهٔ درخواست هیچ ادعایی دربارهٔ درست/غلط ندارد و اگر داشته باشد خوانده
-- نمی‌شود.
--
-- ── زمان ───────────────────────────────────────────────────────────────────
-- `started_at` / `answered_at` / `completed_at` هر سه ساعتِ **دیتابیس** را
-- می‌نویسند، مثل `answered_at` در همهٔ جدول‌های پاسخ. قرارداد در
-- `docs/time-contract.md` است و مخلوط کردنش با ساعتِ Node همان اشتباهی است
-- که یک بار اشتراکِ دبیرها را ۳٫۵ ساعت عقب انداخت.


CREATE TABLE IF NOT EXISTS `kimia_rounds` (
  -- ⚠️ شناسهٔ دور را **سرور** می‌سازد و نه مرورگر.
  --
  -- در «شکار نقش‌ها» شناسه از کلاینت می‌آید و آنجا درست است: آن ستون فقط
  -- جلوی ثبتِ دوباره را می‌گیرد و خودِ فایل می‌گوید «سنجهٔ امنیتی نیست».
  -- اینجا فرق دارد، چون دور *حالت* دارد: تلاشِ اول، شمارشِ تلاش‌ها، و
  -- بسته‌شدن. اگر بازیکن می‌توانست شناسهٔ تازه بسازد، هر پاسخِ غلط را با
  -- یک دورِ نو دور می‌زد و کارنامه‌اش پر از «تلاشِ اول درست» می‌شد.
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ SET NULL و نه CASCADE: حذفِ یک سؤال توسطِ مدیر نباید تاریخچهٔ تمرینِ
  -- دانش‌آموز را ناپدید کند. هر چیزی که تحلیل لازم دارد در همین ردیف
  -- snapshot شده.
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  -- متنِ بیت، برای «دفترِ اشتباه‌ها» بدونِ join.
  `verse` VARCHAR(400) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- ⚠️ بُعدِ اصلیِ تحلیل: «دانش‌آموز در کدام وزن ضعیف است» یعنی گروه‌بندی
  -- روی همین ستون. ارکانِ *متعارف* است — همان رشته‌ای که `aruz_bridge_answers
  -- .correct_pattern` هم نگه می‌دارد — تا هر دو بازی در یک سطل بنشینند و
  -- تحلیلِ وزن دو جزیره نشود.
  --
  -- ⚠️ و کلیدِ متعارف است و نه چیزی از لایهٔ نمایش. رنگِ جوهرها و نشانه‌ها
  -- هیچ‌جای این جدول نیستند: عوض شدنِ پالت در آینده نباید یک ردیفِ تاریخچه
  -- را هم تکان بدهد.
  `meter_ark` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `meter_name` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- تعدادِ جایگاه‌های مخزن = تعدادِ ارکانِ یک *مصراع*. بیت دو مصراع دارد
  -- ولی وزن یکی است؛ سه رکن یعنی سه جایگاه و نه شش.
  `slot_count` TINYINT UNSIGNED NOT NULL,

  `status` VARCHAR(10) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'active',

  `attempts_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,

  -- ── تلاشِ اول: شاهدِ یادگیری ───────────────────────────────────────────
  `first_selected` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `first_correct` TINYINT(1) NULL,
  `first_error_type` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  -- از لحظه‌ای که دور قابلِ‌بازی شده تا اولین «آزمایش ترکیب». کران دارد تا
  -- یک عددِ مسخره از مرورگر نتواند میانگین‌ها را جابه‌جا کند.
  `first_response_ms` INT UNSIGNED NULL,

  -- ── آخرین وضعیت: نتیجهٔ نهایی ─────────────────────────────────────────
  `last_selected` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `last_correct` TINYINT(1) NULL,
  `last_error_type` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  -- ⚠️ کلیدِ بی‌اثر کردنِ ثبتِ دوباره.
  --
  -- سه چیزِ کاملاً عادی یک تلاش را دو بار می‌شمردند: تلاشِ دوبارهٔ `fetch`
  -- وقتی شبکه لرزیده، دو بار اجرا شدنِ effect در حالتِ توسعه، و کلیکِ دومِ
  -- کاربری که فکر کرده چیزی ثبت نشده. اگر شناسهٔ تلاشِ رسیده همین باشد،
  -- هیچ ستونی عوض نمی‌شود و همان پاسخِ قبلی برمی‌گردد.
  --
  -- ⚠️ فقط *آخرین* شناسه نگه داشته می‌شود و این عمدی است: کلاینت تا نیامدنِ
  -- پاسخ، تلاشِ بعدی نمی‌فرستد، پس تنها تکراری که در عمل می‌آید تکرارِ
  -- همین آخری است. یک جدولِ دومِ «همهٔ تلاش‌ها» فقط برای این، دو ردیف به
  -- ازای هر پاسخ می‌ساخت بی‌آنکه سؤالِ تازه‌ای را جواب بدهد.
  `last_attempt_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  -- زمانِ *اولین* تلاش. NULL یعنی این دور هیچ‌وقت آزمایش نشد — رها شده و
  -- شاهدی هم نیست. همهٔ کوئری‌های تحلیل روی این ستون فیلتر می‌کنند، و
  -- نامش عمداً همان `answered_at`ِ بقیهٔ جدول‌های پاسخ است.
  `answered_at` DATETIME(6) NULL,
  `completed_at` DATETIME(6) NULL,

  PRIMARY KEY (`id`),

  KEY `kimia_rounds_user_idx` (`user_id`, `answered_at` DESC),
  -- کوئریِ تحلیل: «ضعیف‌ترین وزن‌های این کاربر».
  KEY `kimia_rounds_meter_idx` (`user_id`, `meter_ark`, `answered_at` DESC),
  KEY `kimia_rounds_question_idx` (`question_id`),
  -- «این کاربر چند دورِ باز دارد» و پاکسازیِ احتمالیِ آینده.
  KEY `kimia_rounds_open_idx` (`user_id`, `status`, `started_at`),

  CONSTRAINT `kimia_rounds_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kimia_rounds_question_fk`
    FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE SET NULL,

  CONSTRAINT `kimia_rounds_status_check`
    CHECK (`status` IN ('active', 'completed')),

  CONSTRAINT `kimia_rounds_slot_count_check`
    CHECK (`slot_count` BETWEEN 2 AND 8),

  -- ⚠️ همان الگوی `aruz_bridge_answers_outcome_matches`: ستونِ مشتق و
  -- ستون‌های مبنا هرگز نباید از هم جدا بیفتند. یک دور دقیقاً وقتی بسته
  -- می‌شود که پاسخِ درست داده شده باشد — نه زودتر و نه دیرتر. اگر روزی کدی
  -- این سه را جدا محاسبه کند و اشتباه کند، درج می‌شکند و نه اینکه بی‌صدا
  -- آمار را کج کند.
  CONSTRAINT `kimia_rounds_completed_matches`
    CHECK ((`status` = 'completed') = (`completed_at` IS NOT NULL)),
  CONSTRAINT `kimia_rounds_completed_is_correct`
    CHECK ((`status` = 'completed') = (`last_correct` = 1)),

  -- تلاش و شاهد با هم می‌آیند: یا هیچ تلاشی نبوده و همهٔ ستون‌های تلاش
  -- خالی‌اند، یا بوده و هر سه پر.
  CONSTRAINT `kimia_rounds_first_attempt_matches`
    CHECK ((`attempts_count` = 0) = (`first_selected` IS NULL)),
  CONSTRAINT `kimia_rounds_answered_matches`
    CHECK ((`attempts_count` = 0) = (`answered_at` IS NULL)),
  CONSTRAINT `kimia_rounds_last_attempt_matches`
    CHECK ((`attempts_count` = 0) = (`last_selected` IS NULL)),

  -- پاسخِ درست «جنسِ اشتباه» ندارد؛ پاسخِ غلط حتماً دارد.
  CONSTRAINT `kimia_rounds_first_error_matches`
    CHECK (`first_correct` IS NULL OR (`first_correct` = 1) = (`first_error_type` IS NULL)),
  CONSTRAINT `kimia_rounds_last_error_matches`
    CHECK (`last_correct` IS NULL OR (`last_correct` = 1) = (`last_error_type` IS NULL)),
  CONSTRAINT `kimia_rounds_error_type_check`
    CHECK (`first_error_type` IS NULL OR `first_error_type` IN ('ORDER_ONLY', 'FOOT_CONTENT')),
  CONSTRAINT `kimia_rounds_last_error_type_check`
    CHECK (`last_error_type` IS NULL OR `last_error_type` IN ('ORDER_ONLY', 'FOOT_CONTENT')),

  -- ۱۰ دقیقه سقفِ سخاوتمندانه‌ای برای فکر کردن روی یک بیت است؛ بالاتر از آن
  -- یعنی تبْ باز مانده و عدد دیگر «زمانِ پاسخ» نیست.
  CONSTRAINT `kimia_rounds_response_ms_check`
    CHECK (`first_response_ms` IS NULL OR `first_response_ms` <= 600000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
