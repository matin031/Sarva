-- =============================================================================
-- ۰۱۰ — چرخهٔ بررسیِ درخواستِ دبیری، تاریخچه، و عضویتِ دبیر در مدرسه
-- =============================================================================
--
-- مهاجرت ۰۰۹ مسیرِ «درخواست بده → ادمین تأیید یا رد کند» را ساخت. در عمل یک
-- حالتِ سوم لازم است و نبودش هزینه دارد:
--
--     تصویرِ حکم خوانا نیست.
--
-- با دو حالتِ فعلی، ادمین یا باید تأیید کند (که نباید) یا رد کند — و ردّ
-- کردن یعنی پروندهٔ کاربر بسته می‌شود و باید از صفر درخواستِ تازه بدهد، همهٔ
-- فیلدها را دوباره پر کند، و در فهرستِ ادمین دو پروندهٔ جدا از یک نفر
-- بنشیند.
--
-- `needs_revision` همان حالتِ میانی است: پرونده **باز** می‌ماند، کاربر فقط
-- مدرکش را عوض می‌کند، و همان ردیف به `pending` برمی‌گردد.
--
-- ⚠️ و مهم‌ترین چیزی که این فایل **اضافه نمی‌کند**: `needs_revision` هیچ
-- دسترسی‌ای نمی‌دهد. نه نقش عوض می‌شود و نه اشتراکی روشن. تنها گذارِ
-- دسترسی‌دهنده همان `pending → approved` است که در
-- `lib/admin/teacher-actions.ts` و داخلِ یک تراکنش با `grantTeacherPlus`
-- انجام می‌شود.
--
-- ⚠️ چرا فایلِ تازه و نه ویرایشِ ۰۰۹: اجراکنندهٔ migration از هر فایل یک
-- checksum نگه می‌دارد (`schema_migrations.checksum`). دست زدن به فایلی که
-- ممکن است جایی اعمال شده باشد، اجرای بعدی را با «این فایل بعد از اعمال عوض
-- شده» متوقف می‌کند.
-- =============================================================================


-- =============================================================================
-- بخش ۱ — وضعیتِ چهارم: needs_revision
-- =============================================================================

-- `DROP CONSTRAINT` و نه `DROP CHECK` — تنها شکلی که روی MariaDB و MySQL هر
-- دو کار می‌کند. استدلالِ کاملش بالای همین دستور در ۰۰۹ نوشته شده.
ALTER TABLE `teacher_requests` DROP CONSTRAINT `teacher_requests_status_check`;
ALTER TABLE `teacher_requests`
  ADD CONSTRAINT `teacher_requests_status_check`
  CHECK (`status` IN ('pending', 'approved', 'rejected', 'needs_revision'));


-- =============================================================================
-- بخش ۲ — «حداکثر یک پروندهٔ باز» باید needs_revision را هم باز بشمارد
-- =============================================================================
--
-- ⚠️ این ظریف‌ترین قسمتِ کلِ فایل است و جا انداختنش یک باگِ بی‌صدا می‌ساخت.
--
-- ستونِ کمکیِ `pending_user_id` (۰۰۹) با یک ایندکسِ یکتا تضمین می‌کند هر
-- کاربر بیشتر از یک درخواستِ *باز* نداشته باشد. مقدارش را تریگر می‌نویسد و
-- تا امروز فقط `status = 'pending'` را باز می‌شمرد.
--
-- اگر همان می‌ماند، پرونده‌ای که به `needs_revision` می‌رفت از نظرِ آن
-- ایندکس «بسته» می‌شد — یعنی کاربر می‌توانست به‌جای اصلاحِ همان پرونده، یک
-- درخواستِ کاملاً تازه ثبت کند و ادمین دو پروندهٔ باز از یک نفر ببیند، با
-- دو مدرکِ متفاوت و این امکان که یکی را تأیید و دیگری را رد کند.
--
-- پس هر دو تریگر بازنویسی می‌شوند. MySQL و MariaDB هیچ‌کدام
-- `CREATE OR REPLACE TRIGGER` قابلِ اتکا ندارند، پس اول حذف.
DROP TRIGGER IF EXISTS `teacher_requests_pending_key_bi`;
DROP TRIGGER IF EXISTS `teacher_requests_pending_key_bu`;

DELIMITER $$

CREATE TRIGGER `teacher_requests_pending_key_bi` BEFORE INSERT ON `teacher_requests`
FOR EACH ROW
  SET NEW.`pending_user_id` =
    IF(NEW.`status` IN ('pending', 'needs_revision'), NEW.`user_id`, NULL)$$

CREATE TRIGGER `teacher_requests_pending_key_bu` BEFORE UPDATE ON `teacher_requests`
FOR EACH ROW
  SET NEW.`pending_user_id` =
    IF(NEW.`status` IN ('pending', 'needs_revision'), NEW.`user_id`, NULL)$$

DELIMITER ;


-- =============================================================================
-- بخش ۳ — تاریخچهٔ بررسیِ هر پرونده
-- =============================================================================
--
-- ⚠️ چرا جدولِ جدا، با اینکه `admin_audit_log` از قبل هست:
--
-- آن یکی لاگِ عملیاتیِ مدیریت است — همه‌چیز از حذف واژه تا اجرای SQL — و
-- فقط ادمین می‌بیندش. این یکی تاریخچهٔ *یک پرونده* است و قرار است به خودِ
-- دبیر هم نشان داده شود («درخواستت چه مسیری را طی کرده»).
--
-- دو تفاوتِ عملی که یکی کردنشان را غلط می‌کند:
--
--   • اینجا ردیف‌هایی هست که **ادمین ننوشته**: `submitted` و `resubmitted`
--     را خودِ کاربر می‌سازد. یک لاگِ «اقدامات مدیران» جای این‌ها نیست.
--   • خواندنِ `admin_audit_log` برای یک کاربرِ عادی یعنی باز کردنِ جدولی که
--     خلاصهٔ کارهای مدیریتیِ کلِ سایت در آن است.
--
-- هر دو می‌مانند: تصمیم‌های ادمین در هر دو ثبت می‌شود.
CREATE TABLE `teacher_verification_logs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `request_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ صاحبِ پرونده، به‌صورت مستقیم و نه فقط از راهِ `request_id`.
  --
  -- تکرارِ ظاهری است ولی کوئریِ «تاریخچهٔ درخواست‌های من» را از یک join
  -- بی‌نیاز می‌کند — همان کوئری‌ای که در صفحهٔ خودِ دبیر اجرا می‌شود.
  `teacher_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ nullable، و این عمدی است.
  --
  -- `submitted` و `resubmitted` را کاربر انجام می‌دهد و ادمینی در کار
  -- نیست. NOT NULL کردنش یعنی مجبور شویم شناسهٔ خودِ کاربر را در ستونِ
  -- «ادمین» بنویسیم — که همان لحظه هر گزارشی از «چه کسی تصمیم گرفت» را
  -- دروغ می‌کند.
  --
  -- `ON DELETE SET NULL` چون حذفِ حسابِ یک ادمین نباید تاریخچهٔ پرونده‌ها
  -- را پاک کند.
  `admin_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `action` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- دلیلِ رد، یادداشتِ اصلاح، یا خالی برای ثبتِ ساده.
  `description` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  -- نمایشِ تاریخچهٔ یک پرونده در پنل ادمین.
  KEY `teacher_verification_logs_request_idx` (`request_id`, `created_at`),
  -- «تاریخچهٔ درخواست‌های من» در پنلِ خودِ دبیر.
  KEY `teacher_verification_logs_teacher_idx` (`teacher_id`, `created_at` DESC),

  CONSTRAINT `teacher_verification_logs_request_fk`
    FOREIGN KEY (`request_id`) REFERENCES `teacher_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_verification_logs_teacher_fk`
    FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_verification_logs_admin_fk`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  CONSTRAINT `teacher_verification_logs_action_check`
    CHECK (`action` IN ('submitted', 'resubmitted', 'approved', 'rejected', 'needs_revision'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۴ — عضویتِ دبیر در مدرسه
-- =============================================================================
--
-- امروز رابطهٔ دبیر با مدرسه فقط *ضمنی* است: از راهِ
-- `teacher_classes.school_id`. یعنی «دبیری که هنوز کلاس نساخته» به هیچ
-- مدرسه‌ای وصل نیست، و «همهٔ دبیرانِ این مدرسه» فقط با یک
-- `select distinct teacher_id from teacher_classes` قابل جواب است — که
-- دبیرانِ بی‌کلاس را جا می‌اندازد.
--
-- ⚠️ این جدول برای بند ۱۳ است (چند دبیر در یک مدرسه، مدیر مدرسه، گزارش
-- مدرسه، اشتراک گروهی) و عمداً **الان هیچ رفتاری را عوض نمی‌کند**:
-- `teacher_classes.school_id` دست‌نخورده می‌ماند و ساختِ کلاس همچنان از
-- همان می‌خواند. تنها کارش این است که وقتی دبیری مدرسه‌ای می‌سازد یا کلاسی
-- زیرِ مدرسه‌ای اضافه می‌کند، یک ردیفِ صریحِ عضویت هم نوشته شود.
--
-- ساختنش *حالا* — و نه وقتی گزارشِ مدرسه لازم شد — یعنی وقتی آن روز برسد،
-- داده‌اش از قبل جمع شده است. اگر بعداً اضافه می‌شد، برای دبیرانِ امروز
-- خالی می‌ماند و باید با یک اسکریپتِ حدسی پُر می‌شد.
CREATE TABLE `teacher_schools` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `teacher_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `school_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  -- یک دبیر در یک مدرسه، یک بار. کدِ بالادست با `INSERT IGNORE` می‌نویسد،
  -- پس تکرار بی‌صدا و بی‌هزینه رد می‌شود.
  UNIQUE KEY `teacher_schools_unique` (`teacher_id`, `school_id`),
  -- «همهٔ دبیرانِ این مدرسه» — کوئریِ اصلیِ گزارشِ مدرسه در آینده.
  KEY `teacher_schools_school_idx` (`school_id`),

  CONSTRAINT `teacher_schools_teacher_fk`
    FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  -- ⚠️ بدونِ CASCADE روی مدرسه، هم‌خوان با `teacher_classes_school_fk`:
  -- مدرسه‌ای که کسی به آن وصل است نباید حذف شود.
  CONSTRAINT `teacher_schools_school_fk`
    FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۵ — نوعِ تازهٔ اعلان
-- =============================================================================
--
-- «مدارکت نیاز به اصلاح دارد» نه تأیید است و نه رد، پس هیچ‌کدام از دو نوعِ
-- موجود (`teacher_approved` / `teacher_rejected`) نمی‌خواند.
--
-- ⚠️ استفادهٔ دوباره از `teacher_rejected` وسوسه‌انگیز بود و غلط: کاربری که
-- فقط باید یک عکسِ واضح‌تر بفرستد، پیامِ «رد شد» می‌گرفت و احتمالاً دیگر
-- تلاش نمی‌کرد.
--
-- (رابط کاربریِ اعلان‌ها هنوز ساخته نشده — مرحلهٔ ۲. ولی ردیفش از همین حالا
--  نوشته می‌شود تا وقتی آن صفحه آمد، تاریخچه خالی نباشد.)
ALTER TABLE `plus_notifications` DROP CONSTRAINT `plus_notifications_kind_check`;
ALTER TABLE `plus_notifications`
  ADD CONSTRAINT `plus_notifications_kind_check`
  CHECK (`kind` IN ('plus_activated', 'plus_renewed', 'plus_expiring', 'plus_expired',
                    'plus_revoked', 'ticket_reply', 'payment_action_needed',
                    'teacher_approved', 'teacher_rejected', 'teacher_needs_revision'));
