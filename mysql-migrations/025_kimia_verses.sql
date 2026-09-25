-- =============================================================================
-- ۰۲۵ — «کیمیای وزن»: بیت‌های مخصوصِ همین بازی
-- =============================================================================
--
-- تا امروز کیمیا فقط از بانکِ عروضِ سماعی (`questions`) می‌خواند. آن بانک
-- مالِ «آزمون وزن شعر» است و `/quiz`، تکلیف‌های دبیر و گزارش‌ها *همه‌اش* را
-- می‌خوانند؛ پس هر بیتی که فقط برای کیمیا آمده باشد نباید آنجا برود، وگرنه
-- بی‌صدا واردِ آزمون می‌شود. بازی‌های «کوتاه یا بلند؟» و «پلِ وزن» هم
-- جدول‌های خودشان را دارند و این جدول به هیچ‌کدامشان وصل نیست.
--
-- ── `source_key` ────────────────────────────────────────────────────────────
-- اثرانگشتِ متنِ بیت (sha1 روی متنِ یکسان‌سازی‌شده) که `scripts/seed-kimia.ts`
-- می‌سازد. کلیدِ یکتا یعنی اجرای دوبارهٔ seed ردیفِ تکراری نمی‌سازد.
--
-- ── `meter_ark` ─────────────────────────────────────────────────────────────
-- ارکانِ متعارف — همان کلیدی که نامِ فایلِ صوتی از آن ساخته شده و
-- `kimia_rounds.meter_ark` هم نگه می‌دارد. اعتبارش (صدا دارد؟ در جدولِ اوزان
-- هست؟) در کد سنجیده می‌شود، همان‌جا که بیت‌های بانکِ عروض هم سنجیده می‌شوند
-- (`lib/kimia/pool.ts`)، تا یک قاعده بماند و نه دو تا.

CREATE TABLE IF NOT EXISTS `kimia_verses` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `source_key` CHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `line_1` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `line_2` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `meter_ark` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  -- نشانیِ همان شعر در گنجور؛ برای رسیدگی به گزارشِ اشکال.
  `source_url` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `kimia_verses_source_key` (`source_key`),
  KEY `kimia_verses_public_idx` (`is_published`),
  CONSTRAINT `kimia_verses_lines_check`
    CHECK (CHAR_LENGTH(TRIM(`line_1`)) > 0 AND CHAR_LENGTH(TRIM(`line_2`)) > 0),
  CONSTRAINT `kimia_verses_ark_check`
    CHECK (CHAR_LENGTH(TRIM(`meter_ark`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;

-- ── دورِ یک بیتِ کیمیا ─────────────────────────────────────────────────────
-- `question_id` کلیدِ خارجی به `questions` دارد، پس شناسهٔ یک بیتِ این جدول
-- در آن جا نمی‌گیرد. ستونِ جدا، با همان سیاستِ SET NULL: حذفِ یک بیت نباید
-- تاریخچهٔ تمرینِ دانش‌آموز را ناپدید کند (متن و وزن در خودِ ردیفِ دور
-- snapshot شده‌اند).
--
-- ⚠️ «فقط یکی از این دو» با CHECK بسته **نشده** و عمدی است: MySQL ستونی را
-- که در عملِ ارجاعیِ یک کلیدِ خارجی (ON DELETE SET NULL) آمده در CHECK
-- نمی‌پذیرد. قاعده در `lib/kimia/server/rounds.ts` است، که تنها جای درجِ
-- این جدول است.

ALTER TABLE `kimia_rounds`
  ADD COLUMN `verse_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL
    AFTER `question_id`;

ALTER TABLE `kimia_rounds`
  ADD KEY `kimia_rounds_verse_idx` (`verse_id`);

ALTER TABLE `kimia_rounds`
  ADD CONSTRAINT `kimia_rounds_verse_fk`
    FOREIGN KEY (`verse_id`) REFERENCES `kimia_verses` (`id`) ON DELETE SET NULL;
