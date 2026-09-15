-- =============================================================================
-- ۰۱۳ — بازخوردِ دبیر به دانش‌آموز
-- =============================================================================
--
-- ── چرا ───────────────────────────────────────────────────────────────────
-- تا اینجا دبیر فقط *می‌بیند*. حلقه وقتی بسته می‌شود که بتواند چیزی هم
-- بگوید — و دانش‌آموز آن را جایی ببیند که به عملکردش وصل است، نه در یک
-- کانالِ جدا.
--
-- ⚠️ این جدولِ «پیام» نیست و نباید بشود. یک‌طرفه است: دبیر می‌نویسد،
-- دانش‌آموز می‌خواند. گفت‌وگوی دوطرفه یعنی نظارت، گزارشِ سوءاستفاده،
-- مسدودسازی و هر چیزی که یک سامانهٔ پیام‌رسان لازم دارد — و هیچ‌کدام
-- اینجا نیست.
--
-- ── حذف ──────────────────────────────────────────────────────────────────
-- ⚠️ حذفِ فیزیکی عمداً وجود ندارد. بازخوردی که دبیر به یک نوجوان داده،
-- بعد از خوانده شدن نباید بتواند ناپدید شود — نه برای دانش‌آموز که آن را
-- خوانده، و نه برای هر بررسیِ بعدی. `status` به‌جایش می‌آید: ردیف می‌ماند،
-- فقط دیگر نمایش داده نمی‌شود.
-- =============================================================================


CREATE TABLE `teacher_feedback` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `teacher_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `student_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ کلاس اجباری است: بازخورد همیشه از راهِ یک کلاس داده می‌شود و
  -- مالکیتش هم از همان‌جا اثبات می‌شود. بدونِ آن، «دبیری که دیگر دبیرِ این
  -- دانش‌آموز نیست» معنای روشنی نداشت.
  `class_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `category` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ ارجاع به یک فعالیتِ مشخص — و هر دو با هم یا هیچ‌کدام.
  --
  -- CHECK پایین همین را تضمین می‌کند. یک `related_type` بدونِ شناسه (یا
  -- برعکس) یعنی ردیفی که کد باید برایش حالتِ چهارم بنویسد و کسی ننوشته.
  `related_type` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `related_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `message` VARCHAR(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- ⚠️ `archived` به‌جای DELETE. چرایی‌اش بالای فایل.
  `status` VARCHAR(12) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'active',

  -- ⚠️ هر دو را **برنامه** می‌نویسد و نه `CURRENT_TIMESTAMP` — همان
  -- قراردادِ `user_activity_events.occurred_at` و `teacher_student_views`.
  -- (`docs/time-contract.md`)
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,

  PRIMARY KEY (`id`),

  -- «بازخوردهای این دانش‌آموز» — نمای خودِ دانش‌آموز، تازه‌ترین اول.
  KEY `teacher_feedback_student_idx` (`student_id`, `status`, `created_at` DESC),
  -- «بازخوردهایی که من به این دانش‌آموز داده‌ام» — نمای دبیر.
  KEY `teacher_feedback_teacher_idx` (`teacher_id`, `student_id`, `created_at` DESC),
  KEY `teacher_feedback_class_idx` (`class_id`),

  CONSTRAINT `teacher_feedback_teacher_fk`
    FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_feedback_student_fk`
    FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_feedback_class_fk`
    FOREIGN KEY (`class_id`) REFERENCES `teacher_classes` (`id`) ON DELETE CASCADE,

  CONSTRAINT `teacher_feedback_category_check`
    CHECK (`category` IN ('general', 'aruz', 'grammar', 'game', 'exam', 'activity')),

  CONSTRAINT `teacher_feedback_status_check`
    CHECK (`status` IN ('active', 'archived')),

  -- ⚠️ متنِ خالی یک بازخورد نیست. فرم جلویش را می‌گیرد، ولی فرم تنها راهِ
  -- رسیدن به این جدول نیست و نباید باشد.
  CONSTRAINT `teacher_feedback_message_check`
    CHECK (CHAR_LENGTH(TRIM(`message`)) BETWEEN 1 AND 2000),

  -- ⚠️ نوعِ ارجاع و شناسه‌اش با هم می‌آیند یا هیچ‌کدام.
  CONSTRAINT `teacher_feedback_related_check`
    CHECK ((`related_type` IS NULL AND `related_id` IS NULL)
        OR (`related_type` IS NOT NULL AND `related_id` IS NOT NULL)),

  CONSTRAINT `teacher_feedback_related_type_check`
    CHECK (`related_type` IS NULL
        OR `related_type` IN ('exam_attempt', 'quiz_attempt', 'activity'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
