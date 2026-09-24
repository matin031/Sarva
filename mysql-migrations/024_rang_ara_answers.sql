-- =============================================================================
-- ۰۲۴ — «رنگ‌آرا»: کارنامهٔ بازیکن
-- =============================================================================
--
-- تا امروز رنگ‌آرا هیچ چیزی ثبت نمی‌کرد و پنلِ کاربر نمی‌توانست بگوید در کدام
-- آرایه قوی است. هر ردیف یک «گام» از یک بیتِ تمام‌شده است: کدام آرایه، و چند
-- ضربهٔ غلط به حسابش نوشته شد.
--
-- ── درستی سمتِ سرور ─────────────────────────────────────────────────────────
-- مرورگر فقط ضربه‌ها را می‌فرستد و `lib/rang-ara/record.ts` با همان داورِ
-- بازی نمره می‌دهد. `is_correct` یعنی «بار اول پیدا شد» و CHECK پایین آن را
-- به `mistakes` قفل می‌کند.
--
-- ── `verse_key` و نه کلیدِ خارجی ────────────────────────────────────────────
-- وقتی هیچ بیتِ منتشرشده‌ای نیست، بازی بیت‌های ثابتِ کد را نشان می‌دهد
-- (`bani-adam` …) که ردیفی در `rang_ara_verses` ندارند. متنِ بیت، پایه و درس
-- در همین ردیف snapshot می‌شوند تا حذفِ یک بیت تاریخچه را خراب نکند.
--
-- ── `play_id` ───────────────────────────────────────────────────────────────
-- ساختهٔ مرورگر، یکی به‌ازای هر بار بازیِ یک بیت. ارسالِ دوباره (شبکهٔ لرزان)
-- روی کلیدِ یکتا می‌خورد و ردیفِ تکراری نمی‌سازد.

CREATE TABLE IF NOT EXISTS `rang_ara_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `play_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `verse_key` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `grade` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `lesson` SMALLINT NULL,
  `verse` VARCHAR(620) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `step_index` TINYINT UNSIGNED NOT NULL,
  `concept` VARCHAR(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `mistakes` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `is_correct` TINYINT(1) NOT NULL,
  `answered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `rang_ara_answers_play_key` (`user_id`, `play_id`, `step_index`),
  KEY `rang_ara_answers_user_idx` (`user_id`, `answered_at` DESC),
  CONSTRAINT `rang_ara_answers_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rang_ara_answers_correct_matches`
    CHECK ((`is_correct` = 1) = (`mistakes` = 0)),
  CONSTRAINT `rang_ara_answers_lesson_check`
    CHECK ((`grade` IS NULL AND `lesson` IS NULL) OR (`grade` IS NOT NULL AND `lesson` BETWEEN 1 AND 18))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
