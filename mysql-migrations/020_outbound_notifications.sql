-- =============================================================================
-- ۰۲۰ — پیام‌های بیرونی: پیامک و ایمیلِ رویدادهای حساب و اشتراک
-- =============================================================================
--
-- ── مسئله ──────────────────────────────────────────────────────────────────
--
-- تا امروز سروا دو جور پیام بیرونی می‌فرستاد و هر دو «همین حالا لازم است»
-- بودند: کدِ ورود و لینکِ بازیابیِ رمز. هر چیزِ دیگری — «حسابت ساخته شد»،
-- «اشتراکت فعال شد»، «سه روز تا پایان اشتراک» — فقط یک ردیف در
-- `plus_notifications` بود، یعنی فقط برای کسی که همان روز به پنل سر بزند.
--
-- کاربری که اشتراکش تمام شده بود، وقتی می‌فهمید که یک قفل جلویش سبز می‌شد.
-- این جدول و دو ستونِ زیر برای همان است.
--
-- ── سه تصمیم که اینجا قفل می‌شوند ──────────────────────────────────────────
--
-- ۱) **رضایت، ستونِ خودِ کاربر است و نه یک تنظیمِ سراسری.**
--    `notify_sms` و `notify_email` روی `users` می‌نشینند و پیش‌فرضشان روشن
--    است. پیش‌فرضِ روشن برای پیامِ *خدماتی* درست است (کسی که اشتراک خریده
--    باید بداند کِی تمام می‌شود)، ولی باید بشود خاموشش کرد — و آن خاموشی
--    باید یک واقعیتِ حساب باشد، نه یک تنظیمِ مرورگر.
--
-- ۲) **هر ارسال یک ردیف دارد، حتی ارسالِ انجام‌نشده.**
--    `sms_log` فقط می‌گوید «پیامکی رفت». این جدول می‌گوید «برای *کدام
--    کاربر* و *کدام رویداد* رفت» — و همین است که تکرار را ممکن می‌کند
--    تشخیص داد. `status = 'skipped'` هم ثبت می‌شود: «نرفت چون کاربر
--    خاموشش کرده» و «نرفت چون سرویس خطا داد» دو چیزِ کاملاً متفاوت‌اند و
--    قاطی‌شدنشان یعنی یک خرابیِ واقعی زیرِ نویزِ رضایت دفن شود.
--
-- ۳) **`dedupe_key` کلیدِ یکتاست و این تنها چیزی است که جلوی پیامکِ تکراری
--    را می‌گیرد.**
--    یادآوریِ «سه روز مانده» یک کارِ زمان‌بندی‌شده است. اگر آن کار دو بار
--    اجرا شود — دو تیک کرونِ هم‌زمان، یک اجرای دستی بعد از اجرای خودکار،
--    یا یک استقرار که کرون را دوباره صدا می‌زند — بدونِ این ایندکس هر
--    کاربر دو پیامک می‌گرفت. برخلافِ اعلانِ درون‌سایتی، این یکی پول دارد و
--    برگشت‌ناپذیر است.

-- =============================================================================
-- بخش ۱ — رضایتِ کاربر
-- =============================================================================

-- ⚠️ پیش‌فرض ۱ و نه ۰. ردیف‌های موجود هم همین را می‌گیرند، که درست است:
-- این پیام‌ها خدماتی‌اند و نه تبلیغاتی. (تبلیغات اگر روزی آمد، ستونِ خودش
-- را می‌خواهد و پیش‌فرضش باید خاموش باشد.)
ALTER TABLE `users`
  ADD COLUMN `notify_sms` TINYINT(1) NOT NULL DEFAULT 1 AFTER `phone_verified_at`,
  ADD COLUMN `notify_email` TINYINT(1) NOT NULL DEFAULT 1 AFTER `notify_sms`;


-- =============================================================================
-- بخش ۲ — تاریخچهٔ ارسال
-- =============================================================================

CREATE TABLE IF NOT EXISTS `outbound_notifications` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- نامِ رویداد: `welcome`، `plus_activated`، … . فهرستِ معتبر در
  -- `lib/notify/events.ts` است و عمداً اینجا CHECK ندارد: رویدادِ تازه نباید
  -- یک مهاجرتِ تازه بخواهد، و ردیفِ ناشناخته هم هیچ‌چیزی را خراب نمی‌کند
  -- (این جدول فقط تاریخچه است).
  `event` VARCHAR(48) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ **یک ردیف برای هر دو کانال، و نه یک ردیف برای هر کانال.**
  --
  -- این شکل از دلِ `dedupe_key` بیرون آمد. کلیدِ یکتا باید *پیش* از ارسال
  -- رزرو شود (وگرنه دو اجرای هم‌زمانِ کرون هر دو می‌فرستند و بعد هر دو
  -- ثبت می‌کنند)، و یک کلید فقط یک ردیف را رزرو می‌کند. با ردیفِ جدا برای
  -- هر کانال، یا کلید باید کانال را هم در خود می‌داشت — یعنی دو نقطهٔ
  -- رزرو و مسابقهٔ بینشان — یا رزرو اصلاً ممکن نبود.
  --
  -- pending — رزرو شد، هنوز نتیجه‌ای نیامده. ردیفی که روی `pending` مانده
  --           یعنی فرایند وسطِ کار مرده؛ دیدنی است و باید دیده شود.
  -- sent    — سرویس تحویل گرفت.
  -- failed  — سرویس خطا داد یا اصلاً در دسترس نبود.
  -- skipped — عمداً نرفت: رضایت نداشت، شماره/ایمیلِ لازم را نداشت، یا قالبش
  --           هنوز در تنظیمات ثبت نشده. دلیل در ستونِ کناری است.
  --
  -- ⚠️ جدا کردنِ `failed` از `skipped` کلِ دلیلِ وجودِ ستونِ دلیل است: بدونِ
  -- آن، یک خرابیِ واقعیِ سرویس زیرِ انبوهِ «کاربر خاموشش کرده» دفن می‌شد.
  `sms_status` VARCHAR(12) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'pending',
  `sms_reason` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  `email_status` VARCHAR(12) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'pending',
  `email_reason` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  -- ⚠️ چیزی که یک بار فرستاده شده دوباره فرستاده نمی‌شود. توضیحِ کامل بالای
  -- همین فایل. NULL یعنی «این پیام یکتا نیست»، و چون MySQL در ایندکسِ یکتا
  -- NULL ها را متمایز می‌شمارد، هر تعداد ردیفِ بی‌کلید مجاز است.
  `dedupe_key` VARCHAR(190) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),

  UNIQUE KEY `outbound_notifications_dedupe_key` (`user_id`, `dedupe_key`),
  KEY `outbound_notifications_user_idx` (`user_id`, `created_at`),
  KEY `outbound_notifications_event_idx` (`event`, `created_at`),

  CONSTRAINT `outbound_notifications_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `outbound_notifications_sms_status_check`
    CHECK (`sms_status` IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT `outbound_notifications_email_status_check`
    CHECK (`email_status` IN ('pending', 'sent', 'failed', 'skipped'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۳ — اعلانِ درون‌سایتیِ «خوش آمدی»
-- =============================================================================
--
-- ⚠️ `welcome` عمداً از `plus_activated` جداست. آن یکی کارتِ خوش‌آمدگوییِ
-- *پلاس* را روشن می‌کند (`getUnreadWelcome`)؛ استفاده‌اش برای ثبت‌نام یعنی
-- هر کاربرِ تازه، onboardingِ خریدِ اشتراک را ببیند بی‌آنکه چیزی خریده باشد.
ALTER TABLE `plus_notifications` DROP CONSTRAINT `plus_notifications_kind_check`;
ALTER TABLE `plus_notifications`
  ADD CONSTRAINT `plus_notifications_kind_check`
  CHECK (`kind` IN ('plus_activated', 'plus_renewed', 'plus_expiring', 'plus_expired',
                    'plus_revoked', 'ticket_reply', 'payment_action_needed',
                    'teacher_approved', 'teacher_rejected', 'teacher_needs_revision',
                    'teacher_viewed_student', 'teacher_feedback',
                    'class_joined', 'class_removed',
                    'teacher_revoked', 'welcome'));
