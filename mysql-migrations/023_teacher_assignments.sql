-- =============================================================================
-- ۰۲۳ — تکلیف و آزمونِ عروض از طرفِ دبیر
-- =============================================================================
--
-- دبیر از صفحهٔ دانش‌آموز یکی از این سه را برایش می‌گذارد:
--
--   • `aruz_quiz`   — آزمونِ عروضِ سماعی (از وزن‌های انتخابی، یا از غلط‌هایش)
--   • `aruz_rapid`  — بازیِ «کوتاه یا بلند؟» — N مصراع
--   • `aruz_bridge` — یک دستِ N سؤالیِ «پل وزن»
--
-- ── چرا فقط یک جدول ────────────────────────────────────────────────────────
-- ⚠️ هیچ جدولِ نتیجهٔ تازه‌ای ساخته نشد. پاسخ‌ها همان‌جایی می‌روند که همیشه
-- می‌رفتند (`user_answers` و `quiz_attempts` برای آزمون، `aruz_bridge_answers`
-- برای پل وزن)، پس تحلیلِ وزن و پنلِ دانش‌آموز بی‌تغییر آن‌ها را می‌بینند.
-- این جدول فقط سه چیز را نگه می‌دارد که هیچ‌جای دیگری نیست:
--
--   ۱) کدام سؤال‌ها — `config.items` را **سرور** هنگامِ ساخت انتخاب می‌کند و
--      بازی همان‌ها را از همین‌جا می‌خواند، نه از نشانیِ صفحه.
--   ۲) وضعیت — شروع، پایان، لغو.
--   ۳) خلاصهٔ همان یک نشست — `result`. پل وزن و «کوتاه یا بلند» شناسهٔ نشست
--      ندارند، پس بدونِ این ستون نمی‌شد گفت کدام پاسخ‌ها مالِ این تکلیف‌اند.
--
-- ── زمان ───────────────────────────────────────────────────────────────────
-- هر چهار ستونِ زمان را **برنامه** می‌نویسد (ساعتِ Node)، مثلِ
-- `teacher_feedback`. مدتِ انجام از تفریقِ دوتایشان درمی‌آید و مخلوط کردنِ
-- دو ساعت همان خطایی است که `docs/time-contract.md` شرح داده.
--
-- ── حذف ──────────────────────────────────────────────────────────────────
-- حذفِ فیزیکی نداریم؛ دبیر تکلیفِ انجام‌نشده را «لغو» می‌کند (`cancelled_at`).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `teacher_assignments` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `teacher_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `student_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  -- مالکیت از راهِ کلاس اثبات می‌شود — همان قاعدهٔ `teacher_feedback`.
  `class_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `kind` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- `{ "items": [شناسهٔ سؤال‌ها به ترتیب], "source"?, "weights"?, "excludeSeen"? }`
  `config` JSON NOT NULL,

  -- فقط برای `aruz_quiz`: همان ردیفِ `quiz_attempts` که تکلیف را کامل کرد.
  `quiz_attempt_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  -- خلاصهٔ نتیجه، سمتِ سرور ساخته‌شده. NULL تا وقتی انجام نشده.
  `result` JSON NULL,

  `created_at` DATETIME(6) NOT NULL,
  `started_at` DATETIME(6) NULL,
  `completed_at` DATETIME(6) NULL,
  `cancelled_at` DATETIME(6) NULL,

  PRIMARY KEY (`id`),

  -- «تکالیفِ من» — نمای دانش‌آموز، تازه‌ترین اول.
  KEY `teacher_assignments_student_idx` (`student_id`, `created_at` DESC),
  -- «تکالیفی که به این دانش‌آموز داده‌ام» — نمای دبیر.
  KEY `teacher_assignments_teacher_idx` (`teacher_id`, `student_id`, `created_at` DESC),
  KEY `teacher_assignments_class_idx` (`class_id`),
  KEY `teacher_assignments_attempt_idx` (`quiz_attempt_id`),

  CONSTRAINT `teacher_assignments_teacher_fk`
    FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_assignments_student_fk`
    FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_assignments_class_fk`
    FOREIGN KEY (`class_id`) REFERENCES `teacher_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_assignments_attempt_fk`
    FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE SET NULL,

  CONSTRAINT `teacher_assignments_kind_check`
    CHECK (`kind` IN ('aruz_quiz', 'aruz_rapid', 'aruz_bridge')),
  CONSTRAINT `teacher_assignments_config_check`
    CHECK (JSON_TYPE(`config`) = 'OBJECT'),
  -- انجام‌شده و لغوشده با هم نمی‌آیند.
  CONSTRAINT `teacher_assignments_state_check`
    CHECK (`completed_at` IS NULL OR `cancelled_at` IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- اعلانِ «دبیرت تکلیف گذاشت»
-- =============================================================================
-- جدولِ اعلانِ تازه‌ای ساخته نمی‌شود؛ `plus_notifications` همان زنگوله است.
-- ⚠️ فهرستِ ۰۲۰ کامل تکرار شده و فقط `teacher_assignment` اضافه شده.
ALTER TABLE `plus_notifications` DROP CONSTRAINT `plus_notifications_kind_check`;
ALTER TABLE `plus_notifications`
  ADD CONSTRAINT `plus_notifications_kind_check`
  CHECK (`kind` IN ('plus_activated', 'plus_renewed', 'plus_expiring', 'plus_expired',
                    'plus_revoked', 'ticket_reply', 'payment_action_needed',
                    'teacher_approved', 'teacher_rejected', 'teacher_needs_revision',
                    'teacher_viewed_student', 'teacher_feedback',
                    'class_joined', 'class_removed',
                    'teacher_revoked', 'welcome', 'teacher_assignment'));
