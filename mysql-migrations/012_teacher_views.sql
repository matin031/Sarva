-- =============================================================================
-- ۰۱۲ — ثبتِ «دبیر عملکردِ دانش‌آموز را دید» و اعلان‌هایش
-- =============================================================================
--
-- ── چرا ثبت می‌شود ────────────────────────────────────────────────────────
-- دبیر به دادهٔ آموزشیِ یک نوجوان دسترسی دارد. کمترین چیزی که در برابرِ این
-- دسترسی لازم است، این است که خودِ دانش‌آموز بداند چه کسی و کِی نگاه کرده.
-- بدونِ این ردیف، دسترسی هست و هیچ ردی از آن نیست.
--
-- ⚠️ و برعکسش هم: این جدول **فقط** می‌گوید «دیده شد». هیچ چیزِ دیگری از
-- فعالیتِ دبیر ثبت نمی‌شود و هیچ دانش‌آموزی نمی‌تواند ببیند دبیرش سراغِ چه
-- کسانِ دیگری رفته.
--
-- ── ثبت و اعلان دو چیزِ جدا هستند ────────────────────────────────────────
-- ⚠️ این مهم‌ترین تصمیمِ این فایل است.
--
-- اگر «هر ردیفِ این جدول = یک اعلان» بود، دبیری که صفحه را چند بار تازه
-- می‌کند — کاری که هر کسی موقعِ کار کردن با یک جدول می‌کند — برای
-- دانش‌آموزش ده اعلان می‌ساخت. آن‌وقت دانش‌آموز اعلان‌ها را خاموش می‌کند و
-- اعلانِ واقعیِ بعدی را هم نمی‌بیند.
--
-- پس:
--   • **هر** بازدید اینجا ثبت می‌شود (دقیق، برای شفافیت).
--   • اعلان در یک پنجرهٔ زمانی فقط **یک بار** ساخته می‌شود
--     (`lib/teacher/views.ts`).
--
-- ── لحن ──────────────────────────────────────────────────────────────────
-- ⚠️ متنِ اعلان نباید حسِ نظارت بدهد. «دبیر شما فعالیت‌های شما را رصد کرد»
-- ترسناک است؛ «آقای احمدی روند یادگیری شما را بررسی کرد» همان واقعیت است
-- با لحنِ آموزشی. متن‌ها در `lib/teacher/views.ts` هستند.
-- =============================================================================


CREATE TABLE `teacher_student_views` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `teacher_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `student_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ کلاس هم ثبت می‌شود و nullable نیست: «از راهِ کدام کلاس دیده شد»
  -- بخشی از خودِ واقعیت است. دبیری که دو کلاس دارد و دانش‌آموزی در هر دو،
  -- بدونِ این ستون معلوم نبود بازدید به کدام مربوط بوده.
  `class_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ مثلِ `user_activity_events.occurred_at` این را **برنامه** می‌نویسد و
  -- نه `CURRENT_TIMESTAMP`. چرایی‌اش در `docs/time-contract.md`: تا وقتی
  -- وضعیتِ منطقهٔ زمانیِ production اندازه‌گیری نشده، تنها راهِ داشتنِ یک
  -- ستونِ بی‌ابهام این است که مقدارش از Node بیاید.
  `viewed_at` DATETIME(6) NOT NULL,

  PRIMARY KEY (`id`),

  -- «آخرین بار کِی این دبیر این دانش‌آموز را در این کلاس دید؟»
  -- همان کوئریِ تصمیم‌گیریِ اعلان — باید یک range scanِ کوتاه باشد.
  KEY `teacher_student_views_triple_idx`
    (`teacher_id`, `student_id`, `class_id`, `viewed_at` DESC),

  -- «چه کسانی عملکردِ من را دیده‌اند» — نمای خودِ دانش‌آموز.
  KEY `teacher_student_views_student_idx` (`student_id`, `viewed_at` DESC),

  CONSTRAINT `teacher_student_views_teacher_fk`
    FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_student_views_student_fk`
    FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_student_views_class_fk`
    FOREIGN KEY (`class_id`) REFERENCES `teacher_classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- نوع‌های تازهٔ اعلان
-- =============================================================================
--
-- ⚠️ جدولِ تازه‌ای برای اعلان ساخته **نمی‌شود**. `plus_notifications` با
-- وجودِ نامش یک جدولِ عمومی است: `kind`، `title`، `body`، `href`،
-- `dedupe_key` و `read_at` — دقیقاً همان چیزی که لازم است. یک سیستمِ دومِ
-- موازی یعنی دانش‌آموز باید دو جا را نگاه کند و زنگولهٔ شمارنده یکی‌شان را
-- جا بیندازد.
--
-- ⚠️ فهرستِ فعلی پیش از نوشتن **کامل خوانده شد** و هر ده مقدارِ موجود
-- اینجا تکرار می‌شوند؛ جا انداختنِ حتی یکی، ثبتِ آن نوع را از فردا
-- می‌شکست.
--
-- چهار مقدارِ تازه:
--   • `teacher_viewed_student` — همین مرحله.
--   • `teacher_feedback`       — مرحلهٔ بعد (بازخوردِ دبیر).
--   • `class_joined` / `class_removed` — عضویت و خروج از کلاس.
--
-- ⚠️ هر چهار مقدار **حالا** اضافه می‌شوند، با اینکه دو تایشان هنوز نوشته
-- نمی‌شوند. دلیلش همان درسی است که ۰۱۰ داد: یک `kind`ِ تازه بدونِ migration
-- یعنی `notify()` روی هاست خطای CHECK می‌گیرد — و پیش از اصلاحِ آن تابع،
-- بی‌صدا هم ناپدید می‌شد.
ALTER TABLE `plus_notifications` DROP CONSTRAINT `plus_notifications_kind_check`;
ALTER TABLE `plus_notifications`
  ADD CONSTRAINT `plus_notifications_kind_check`
  CHECK (`kind` IN ('plus_activated', 'plus_renewed', 'plus_expiring', 'plus_expired',
                    'plus_revoked', 'ticket_reply', 'payment_action_needed',
                    'teacher_approved', 'teacher_rejected', 'teacher_needs_revision',
                    'teacher_viewed_student', 'teacher_feedback',
                    'class_joined', 'class_removed'));
