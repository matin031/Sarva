-- =============================================================================
-- ۰۰۸ — محتوای بازی «کوتاه یا بلند؟» (تقطیعِ سریع)
-- =============================================================================
--
-- تا امروز این بازی تنها بازیِ سایت بود که هیچ جدولی نداشت: از
-- `lib/aruz-rapid/demo-questions.ts` بازی می‌شد، یعنی پنج مصراعِ ثابت که
-- خودِ فایل بالای سرش نوشته «دادهٔ نمایشی، مرجعِ علمی نیست». مدیر راهی برای
-- اضافه کردن نداشت.
--
-- ⚠️ چرا `units` یک ستونِ JSON است و نه یک جدولِ فرزند:
--
-- هجاهای یک مصراع هیچ‌وقت جدا از خودِ مصراع معنا ندارند — نه جست‌وجو
-- می‌شوند، نه به تنهایی ویرایش، نه به چیزی وصل. همیشه با هم خوانده و با هم
-- نوشته می‌شوند. یک جدولِ فرزند یعنی یک join در هر خواندن و یک تراکنش در هر
-- ذخیره، برای دادهٔ ای که همیشه یک تکه است. (قراردادِ «آرایه: JSON» در ۰۰۳ هم
-- همین است.)
--
-- شکلِ هر عضو: {"display": "تَ", "length": "short"}
-- و اعتبارسنجی‌اش در `lib/aruz-rapid/validator.ts` است، نه اینجا: CHECK
-- نمی‌تواند بگوید «همهٔ اعضا باید display داشته باشند» — و مهم‌تر، آن
-- اعتبارسنج از قبل وجود دارد و بازی هم از همان استفاده می‌کند، پس یک قاعده
-- می‌ماند و نه دو تا.
--
-- ⚠️ `preview_text` یکتاست تا افزودنِ انبوهِ دوباره‌اجراشده مصراعِ تکراری
-- نسازد — همان کاری که `memory_pairs_unique_work` برای جفت‌های ادبی می‌کند.
-- VARCHAR(191) است و نه TEXT، چون کلیدِ یکتا روی TEXT در utf8mb4 از سقفِ
-- ۳۰۷۲ بایتیِ ایندکس رد می‌شود. یک مصراع هرگز به ۱۹۱ نویسه نمی‌رسد.

CREATE TABLE IF NOT EXISTS `aruz_rapid_questions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `preview_text` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `units` JSON NOT NULL,
  `meter` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `attribution` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `explanation` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  -- ادغامِ عروضی: «نَو اَز» که «نَ» + «وَز» می‌شود. با این پرچم، اعتبارسنج
  -- دربارهٔ نخواندنِ متنِ هجاها با متنِ مصراع هشدار نمی‌دهد.
  `has_unit_overlap` TINYINT(1) NOT NULL DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `aruz_rapid_questions_preview_key` (`preview_text`),
  KEY `aruz_rapid_questions_published_idx` (`is_published`, `sort_index`, `preview_text`),
  CONSTRAINT `aruz_rapid_questions_preview_check` CHECK (CHAR_LENGTH(TRIM(`preview_text`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;

-- هم‌شکلِ بقیهٔ جدول‌های محتوایی (۰۰۲): updated_at با تریگر، نه با
-- ON UPDATE CURRENT_TIMESTAMP.
DROP TRIGGER IF EXISTS `aruz_rapid_questions_touch`;

DELIMITER $$
CREATE TRIGGER `aruz_rapid_questions_touch` BEFORE UPDATE ON `aruz_rapid_questions`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$
DELIMITER ;
