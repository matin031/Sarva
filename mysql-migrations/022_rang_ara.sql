-- =============================================================================
-- ۰۲۲ — «رنگ‌آرا»: بانکِ بیت‌ها
-- =============================================================================
--
-- هر ردیف یک بیت است با چند «گام»: در هر گام شخصیتِ بازی یک آرایه
-- (مشبّه، استعاره، کنایه، …) را می‌خواهد و بازیکن واژهٔ درست را با رنگِ همان
-- آرایه رنگ می‌کند. بیت‌ها را مدیر از `/admin/games/rang-ara` می‌سازد.
--
-- ── پایه و درس ──────────────────────────────────────────────────────────────
-- `grade` همان کلیدِ رشته‌ایِ سرتاسرِ پروژه است (`dahom` …) و `lesson` شمارهٔ
-- درس در کتاب. هر دو NULL یعنی «خارج از کتاب»؛ یکی بدونِ دیگری معنا ندارد و
-- CHECK جلویش را می‌گیرد.
--
-- ── چرا گام‌ها JSON‌اند و نه جدولِ فرزند ──────────────────────────────────
-- گام‌ها همیشه با هم و در یک ذخیره نوشته می‌شوند، ترتیبشان بخشی از محتواست و
-- هیچ‌چیز بیرون از همین بیت به یک گام ارجاع نمی‌دهد. جدولِ فرزند فقط راهِ
-- تازه‌ای برای رسیدن به بیتی با گام‌های نیمه‌ذخیره می‌ساخت. همان تصمیمِ
-- `grammar_circuit_questions.payload`. درستیِ درونِ JSON (شناسهٔ واژه‌ها،
-- مفهوم‌ها، تکراری نبودنِ جواب‌ها) را `lib/rang-ara/verse.ts` پیش از ذخیره
-- می‌سنجد، و بازی هم بیتِ ناسالم را کنار می‌گذارد.
--
-- ── `source_key` ────────────────────────────────────────────────────────────
-- فقط برای ردیف‌هایی که از seed آمده‌اند (`book:dahom-05-2`، `outside:…`)، تا
-- اجرای دوبارهٔ seed چیزی را تکراری نکند. ردیف‌های ساختهٔ پنل NULL دارند و
-- UNIQUE چند NULL را می‌پذیرد.

CREATE TABLE IF NOT EXISTS `rang_ara_verses` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `source_key` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `grade` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `lesson` SMALLINT NULL,
  `poet` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `source` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `line_1` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `line_2` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `meaning` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `steps` JSON NOT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `rang_ara_verses_source_key` (`source_key`),
  KEY `rang_ara_verses_public_idx` (`is_published`, `grade`, `lesson`, `sort_index`),
  CONSTRAINT `rang_ara_verses_grade_check`
    CHECK (`grade` IS NULL OR `grade` IN ('dahom', 'yazdahom', 'davazdahom')),
  CONSTRAINT `rang_ara_verses_lesson_check`
    CHECK ((`grade` IS NULL AND `lesson` IS NULL) OR (`grade` IS NOT NULL AND `lesson` BETWEEN 1 AND 18)),
  CONSTRAINT `rang_ara_verses_lines_check`
    CHECK (CHAR_LENGTH(TRIM(`line_1`)) > 0 AND CHAR_LENGTH(TRIM(`line_2`)) > 0),
  CONSTRAINT `rang_ara_verses_steps_check` CHECK (JSON_TYPE(`steps`) = 'ARRAY')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
