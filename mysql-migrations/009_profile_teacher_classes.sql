-- =============================================================================
-- ۰۰۹ — پروفایلِ تکمیلی، فعال‌سازیِ دبیر، و کلاس‌ها
-- =============================================================================
--
-- تا اینجا ثبت‌نام و پروفایل یک چیز بودند: هر چه لازم بود، همان لحظهٔ ساختنِ
-- حساب پرسیده می‌شد. این مهاجرت آن دو را از هم جدا می‌کند — ثبت‌نام فقط
-- «ایمیل یا موبایل + احراز هویت» می‌ماند و بقیهٔ اطلاعات از داخلِ پنل گرفته
-- می‌شود — و در ادامه سه چیزِ تازه می‌آورد: درخواستِ دبیر شدن، مدرسه، و کلاس.
--
-- ⚠️ سنگین‌ترین تصمیمِ این فایل یک ستونی است که *اضافه نشده*: هیچ ستونی که
-- کاربر بتواند بنویسد، نقش یا دسترسی نمی‌دهد.
--
-- `users.role` همچنان تنها منبعِ حقیقتِ نقش است و فقط سرور می‌نویسدش. چیزی
-- که کاربر انتخاب می‌کند در ستونِ جداگانهٔ `desired_role` می‌نشیند و معنایش
-- دقیقاً یک جمله است: «دوست دارم دبیر باشم». تا وقتی مدیر ردیفِ
-- `teacher_requests` را تأیید نکند، این ستون هیچ دری را باز نمی‌کند.
--
-- اگر این دو یکی بودند — یعنی اگر فرمِ پروفایل مستقیم روی `role` می‌نوشت —
-- یک درخواستِ ساده به `/api/v1/auth/profile` با `{"role":"teacher"}` کافی
-- بود تا هرکسی دبیر شود، و بدتر: طبق بند ۸، صاحبِ اشتراکِ مادام‌العمر.
-- =============================================================================


-- =============================================================================
-- بخش ۱ — ستون‌های پروفایل روی users
-- =============================================================================

-- ⚠️ نام و نام خانوادگی *جدا* ذخیره می‌شوند، ولی `full_name` هم می‌ماند.
--
-- حذفِ `full_name` وسوسه‌انگیز بود و غلط: نامِ نویسندهٔ سروده‌ها و دیدگاه‌ها
-- در سروا کلاب از همان ستون می‌آید، سایدبارِ پنل همان را نشان می‌دهد، و
-- خلاصهٔ لاگِ مدیریت هم همان را می‌نویسد. با رفتنش، هر سه باید هر بار
-- `concat_ws` بزنند — یعنی یک قاعدهٔ نمایشی در ده جای مختلف تکرار شود.
--
-- پس `full_name` می‌ماند و *مشتق* است: هر بار که نام یا نام خانوادگی نوشته
-- شود، تریگرِ بخش ۲ دوباره می‌سازدش. یعنی کدِ برنامه نمی‌تواند فراموشش کند.
ALTER TABLE `users`
  ADD COLUMN `first_name` VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL AFTER `full_name`,
  ADD COLUMN `last_name`  VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL AFTER `first_name`;

-- ⚠️ نشانیِ *نسبیِ* تصویر (`/uploads/avatars/…`) و نه یک URL کامل.
--
-- همان قاعده‌ای که `lib/storage` برای هر فایلِ دیگری دارد: دیتابیس نباید
-- بداند فایل روی دیسکِ سرور است یا روی یک CDN. با ذخیرهٔ دامنه، عوض کردنِ
-- محلِ فایل‌ها به یک UPDATE روی هزاران ردیف تبدیل می‌شد.
ALTER TABLE `users`
  ADD COLUMN `avatar_url` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL AFTER `last_name`;

-- ⚠️ استان و شهر با *شناسه* ذخیره می‌شوند و نه با نام.
--
-- شناسه‌ها از `lib/geo` می‌آیند (دادهٔ Open Admin Data، با مجوز CC-BY-4.0) و
-- شکلشان `IR005` برای استان و `IR005001` برای شهرستان است — یعنی شناسهٔ شهر
-- خودش شناسهٔ استان را به‌عنوان پیشوند دارد.
--
-- اگر نام ذخیره می‌شد، «آذربایجان شرقی» و «آذربايجان شرقی» (با یِ عربی) دو
-- استانِ متفاوت می‌شدند و گزارشِ «چند دبیر از این استان داریم؟» هیچ‌وقت
-- عددِ درست نمی‌داد. نامِ نمایشی از روی شناسه در کد ساخته می‌شود.
--
-- ⚠️ و چرا جدولِ `provinces`/`cities` ساخته نشد: این داده سالی یکی‌دو بار
-- عوض می‌شود و همیشه به شکلِ «یک شهرستانِ تازه تقسیم شد». نگه داشتنش در کد
-- یعنی به‌روزرسانی‌اش یک commit است و نه یک migration + یک اسکریپتِ seed که
-- باید روی هر محیط جداگانه اجرا شود. کلیدِ خارجی‌اش را از دست می‌دهیم، ولی
-- CHECK پایین شکلش را تضمین می‌کند و *وجودِ* واقعی‌اش را لایهٔ اعتبارسنجیِ
-- `lib/geo`.
ALTER TABLE `users`
  ADD COLUMN `province_id` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER `avatar_url`,
  ADD COLUMN `city_id`     VARCHAR(12) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER `province_id`,
  ADD COLUMN `school`      VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL AFTER `city_id`,
  ADD COLUMN `grade`       VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER `school`;

ALTER TABLE `users`
  ADD CONSTRAINT `users_province_format_check`
    CHECK (`province_id` IS NULL OR `province_id` REGEXP '^IR[0-9]{3}$');

ALTER TABLE `users`
  ADD CONSTRAINT `users_city_format_check`
    CHECK (`city_id` IS NULL OR `city_id` REGEXP '^IR[0-9]{6}$');

ALTER TABLE `users`
  ADD CONSTRAINT `users_grade_check`
    CHECK (`grade` IS NULL OR `grade` IN ('10', '11', '12'));

-- ⚠️ شهر بدونِ استان بی‌معناست، و شهری که زیرِ استانِ دیگری باشد بدتر:
-- یک ردیف که می‌گوید «استانِ تهران، شهرستانِ تبریز». چون شناسهٔ شهر با
-- شناسهٔ استان شروع می‌شود، دیتابیس خودش می‌تواند این را بسنجد و لازم نیست
-- به یادِ کدِ برنامه بماند.
ALTER TABLE `users`
  ADD CONSTRAINT `users_city_under_province_check`
    CHECK (`city_id` IS NULL OR (`province_id` IS NOT NULL AND LEFT(`city_id`, 5) = `province_id`));

-- ⚠️ «می‌خواهم دبیر باشم» — یک *خواسته*، نه یک دسترسی.
--
-- توضیحِ کاملش بالای همین فایل است. تکرارِ یک‌خطی‌اش چون همین ستون است که
-- اگر روزی کسی با `role` اشتباهش بگیرد، کلِ بند ۹ فرو می‌ریزد:
--
--     desired_role → کاربر می‌نویسد، هیچ دری باز نمی‌کند.
--     role         → فقط سرور می‌نویسد، هر دری از آن باز می‌شود.
ALTER TABLE `users`
  ADD COLUMN `desired_role` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci
    NOT NULL DEFAULT 'student' AFTER `role`,
  ADD COLUMN `profile_completed_at` DATETIME(6) NULL AFTER `phone_verified_at`;

ALTER TABLE `users`
  ADD CONSTRAINT `users_desired_role_check` CHECK (`desired_role` IN ('student', 'teacher'));

-- ⚠️ نقشِ تازه: `teacher`.
--
-- CHECK قبلی فقط `student` و `admin` را می‌پذیرفت، پس تأییدِ مدیر بدونِ این
-- خط با خطای constraint شکست می‌خورد — و چون آن UPDATE داخلِ همان تراکنشی
-- است که اشتراک را هم می‌سازد، کلِ تأیید rollback می‌شد.
--
-- ⚠️ `DROP CONSTRAINT` و نه `DROP CHECK` — و این تنها شکلی است که روی هر دو
-- موتور کار می‌کند:
--
--   • MariaDB (از ۱۰٫۲) فقط `DROP CONSTRAINT` را می‌شناسد و `DROP CHECK`
--     برایش خطای نحوی است.
--   • MySQL هر دو را می‌پذیرد: `DROP CHECK` از ۸٫۰٫۱۶ و `DROP CONSTRAINT`
--     از ۸٫۰٫۱۹.
--
-- یعنی کفِ نسخهٔ MySQL برای این مهاجرت ۸٫۰٫۱۹ است. اگر روزی روی سروری
-- اجرا شد که قدیمی‌تر بود، خطایش صریح است و نه بی‌صدا — که مهم‌تر از
-- پشتیبانی از آن نسخه‌هاست.
--
-- (این دو دستور اولین جایی در پروژه‌اند که CHECK را حذف می‌کنند؛ پیش از
-- این هیچ نمونه‌ای نبود که از رویش تقلید شود.)
ALTER TABLE `users` DROP CONSTRAINT `users_role_check`;
ALTER TABLE `users`
  ADD CONSTRAINT `users_role_check` CHECK (`role` IN ('student', 'teacher', 'admin'));

-- «چند دبیر در این شهر داریم؟» و «فهرستِ کاربرانِ این استان» — هر دو در پنل
-- مدیریت لازم می‌شوند.
ALTER TABLE `users` ADD KEY `users_location_idx` (`province_id`, `city_id`);


-- =============================================================================
-- بخش ۲ — `full_name` مشتق می‌شود
-- =============================================================================
--
-- ⚠️ چرا تریگر و نه ستونِ تولیدشده (GENERATED ALWAYS AS):
--
-- MariaDB داخلِ `GENERATED ALWAYS AS` نه `IF` می‌پذیرد و نه `CASE` (خطای
-- ۱۹۰۱) — همان محدودیتی که در ۰۰۳ برای `sellable_plan_id` هم به آن خوردیم و
-- آنجا هم جوابش تریگر بود. `CONCAT_WS` به‌تنهایی بی‌اشکال است، ولی وقتی هر
-- دو ستون NULL باشند رشتهٔ خالی می‌دهد و نه NULL — و رشتهٔ خالی در سایدبار
-- به‌جای «کاربر سروا» یک جای خالی نشان می‌دهد.
--
-- ⚠️ و چرا اصلاً در دیتابیس و نه در `lib/profile`:
-- `full_name` را امروز سه مسیرِ مختلف می‌نویسند (ثبت‌نام با ایمیل، ورودِ
-- گوگل، و فرمِ تنظیمات). هر قاعده‌ای که در کد بماند، اولین مسیرِ چهارم
-- نادیده‌اش می‌گیرد و از آن لحظه نامِ نمایشی با نامِ واقعی اختلاف پیدا
-- می‌کند — بی‌سروصدا و برای همیشه.
--
-- ⚠️ شرطِ `first_name IS NOT NULL OR last_name IS NOT NULL` عمدی است:
-- کاربرِ قدیمی که فقط `full_name` دارد و هنوز پروفایلش را کامل نکرده، نباید
-- با یک UPDATE روی ستونِ دیگری نامش پاک شود.

DELIMITER $$

CREATE TRIGGER `users_full_name_bi` BEFORE INSERT ON `users`
FOR EACH ROW
BEGIN
  IF NEW.`first_name` IS NOT NULL OR NEW.`last_name` IS NOT NULL THEN
    SET NEW.`full_name` = NULLIF(TRIM(CONCAT_WS(' ', NEW.`first_name`, NEW.`last_name`)), '');
  END IF;
END$$

CREATE TRIGGER `users_full_name_bu` BEFORE UPDATE ON `users`
FOR EACH ROW
BEGIN
  IF NEW.`first_name` IS NOT NULL OR NEW.`last_name` IS NOT NULL THEN
    SET NEW.`full_name` = NULLIF(TRIM(CONCAT_WS(' ', NEW.`first_name`, NEW.`last_name`)), '');
  END IF;
END$$

DELIMITER ;


-- =============================================================================
-- بخش ۳ — درخواستِ فعال‌سازیِ حسابِ دبیر
-- =============================================================================
--
-- ⚠️ این جدول دو چیزِ حساس کنار هم دارد — کد ملی و مسیرِ فایلِ حکم — و به
-- همین دلیل هیچ‌کدامشان از هیچ endpointِ کاربری بیرون نمی‌روند. فایل هم
-- عمداً در انبارِ عمومی (`/uploads`) نمی‌نشیند: آنجا هر کسی که نشانی را
-- داشته باشد می‌خواندش، و نشانی‌ها در لاگِ پروکسی و تاریخچهٔ مرورگر
-- می‌مانند. مسیرِ خصوصی و سروِ فقط-مدیر در `lib/teacher/documents.ts`.

CREATE TABLE `teacher_requests` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ کد ملی، ده رقمِ لاتین و بدونِ خط تیره. اعتبارسنجیِ رقمِ کنترلی در
  -- `lib/profile/national-id.ts` است؛ اینجا فقط شکل تضمین می‌شود، چون یک
  -- REGEXP نمی‌تواند الگوریتمِ کنترلی را پیاده کند.
  `national_id` CHAR(10) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ عکسِ لحظه‌ایِ شماره، نه ارجاع به `users.phone`.
  --
  -- کاربر می‌تواند فردا شماره‌اش را عوض کند؛ آنچه مدیر هنگام بررسی دیده باید
  -- همان بماند. بند ۵ می‌گوید این شماره باید *تأییدشده* باشد — و آن را
  -- `lib/teacher/requests.ts` پیش از insert بررسی می‌کند، چون یک CHECK از
  -- اینجا نمی‌تواند به `phone_verified_at` نگاه کند.
  `phone` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- محلِ تدریس — جدا از استان/شهرِ خودِ پروفایل، چون این دو لزوماً یکی
  -- نیستند: کسی می‌تواند در کرج زندگی کند و در تهران درس بدهد.
  `province_id` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `city_id` VARCHAR(12) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `school` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- ⚠️ کلیدِ داخلیِ انبارِ خصوصی — نه یک URL.
  --
  -- اگر اینجا نشانی ذخیره می‌شد، اولین کسی که آن را در یک `<img src>` یا یک
  -- لینک می‌گذاشت، حکمِ کارگزینیِ یک نفر را روی اینترنت پخش می‌کرد. یک کلید
  -- بدونِ مسیرِ سروِ فقط-مدیر، به‌تنهایی هیچ کاری نمی‌کند.
  `document_key` VARCHAR(300) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  -- نامِ اصلیِ فایل، فقط برای اینکه مدیر بداند چه دانلود می‌کند. هرگز روی
  -- دیسک استفاده نمی‌شود (توضیحش کنارِ `safeName` در `lib/storage`).
  `document_name` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `document_type` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `document_size` INT NOT NULL,

  `status` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'pending',

  -- بند ۶: در صورت رد شدن، دلیلش باید به کاربر نشان داده شود. اجباری بودنش
  -- در `lib/admin/teacher-actions.ts` است و نه اینجا — یک CHECK شرطی روی دو
  -- ستون در MariaDB با `ON DELETE SET NULL`ِ `reviewed_by` همان تعارضی را
  -- می‌سازد که در ۰۰۳ توضیح داده شده.
  `rejection_reason` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  `reviewed_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `reviewed_at` DATETIME(6) NULL,

  -- ⚠️ ستونِ کمکی برای «حداکثر یک درخواستِ در انتظارِ بررسی برای هر کاربر».
  --
  -- همان الگوی `sellable_plan_id` در ۰۰۳: ایندکسِ یکتا NULL ها را متمایز
  -- می‌شمارد، پس ستونی که فقط برای ردیفِ `pending` مقدار دارد، دقیقاً همان
  -- ایندکسِ جزئیِ Postgres است. مقدارش را تریگرِ پایین می‌نویسد.
  --
  -- بدونِ این، کاربری که دکمهٔ «ارسال درخواست» را دوبار بزند دو ردیف
  -- می‌سازد و مدیر دو بار همان پرونده را می‌بیند — و بدتر، می‌تواند یکی را
  -- تأیید و دیگری را رد کند.
  `pending_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_requests_one_pending_key` (`pending_user_id`),
  KEY `teacher_requests_user_idx` (`user_id`, `created_at` DESC),
  -- کوئریِ اصلیِ پنل مدیریت: «درخواست‌های در انتظار، تازه‌ترین اول».
  KEY `teacher_requests_queue_idx` (`status`, `created_at` DESC),

  CONSTRAINT `teacher_requests_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_requests_reviewer_fk`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  CONSTRAINT `teacher_requests_status_check`
    CHECK (`status` IN ('pending', 'approved', 'rejected')),
  CONSTRAINT `teacher_requests_national_id_check`
    CHECK (`national_id` REGEXP '^[0-9]{10}$'),
  CONSTRAINT `teacher_requests_phone_format_check`
    CHECK (`phone` REGEXP '^989[0-9]{9}$'),
  CONSTRAINT `teacher_requests_province_format_check`
    CHECK (`province_id` REGEXP '^IR[0-9]{3}$'),
  CONSTRAINT `teacher_requests_city_format_check`
    CHECK (`city_id` REGEXP '^IR[0-9]{6}$' AND LEFT(`city_id`, 5) = `province_id`),
  CONSTRAINT `teacher_requests_size_check` CHECK (`document_size` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;

DELIMITER $$

CREATE TRIGGER `teacher_requests_pending_key_bi` BEFORE INSERT ON `teacher_requests`
FOR EACH ROW
  SET NEW.`pending_user_id` = IF(NEW.`status` = 'pending', NEW.`user_id`, NULL)$$

CREATE TRIGGER `teacher_requests_pending_key_bu` BEFORE UPDATE ON `teacher_requests`
FOR EACH ROW
  SET NEW.`pending_user_id` = IF(NEW.`status` = 'pending', NEW.`user_id`, NULL)$$

DELIMITER ;


-- =============================================================================
-- بخش ۴ — مدرسه
-- =============================================================================
--
-- ⚠️ چرا `users.school` یک متنِ آزاد ماند ولی این یکی یک جدول است:
--
-- آن ستون فقط یک برچسبِ نمایشی روی پروفایلِ خودِ کاربر است و هیچ‌چیزی به آن
-- وصل نمی‌شود؛ تبدیلش به کلیدِ خارجی یعنی هر دانش‌آموزی که مدرسه‌اش در
-- فهرست نیست یک ردیفِ تازه بسازد — و ظرفِ یک ماه چند هزار املای متفاوتِ
-- «دبیرستان شهید بهشتی» داشته باشیم.
--
-- اینجا برعکس است: کلاس باید به یک *چیز* وصل شود که دو دبیرِ همان مدرسه هم
-- به همان اشاره کنند. پس فقط دبیرِ تأییدشده می‌تواند مدرسه بسازد (گاردش در
-- `lib/teacher/schools.ts`) و یکتاییِ (شهر، نام) جلوی دوتایی شدن را می‌گیرد.

CREATE TABLE `schools` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `name` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `province_id` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `city_id` VARCHAR(12) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ شکلِ یکدست‌شدهٔ نام، فقط برای ایندکسِ یکتا.
  --
  -- collation این جدول `utf8mb4_bin` است، یعنی «مدرسهٔ الف» و «مدرسه الف» و
  -- «مدرسة الف» سه مقدارِ متفاوت‌اند و هر سه می‌توانند کنار هم بنشینند.
  -- `normalizeSchoolName` در `lib/teacher/schools.ts` یِ عربی، کافِ عربی،
  -- اعراب، فاصلهٔ مجازی و فاصله‌های تکراری را یکدست می‌کند و *نتیجه‌اش* در
  -- این ستون می‌نشیند. نامی که نمایش داده می‌شود همان چیزی است که دبیر
  -- نوشته.
  `name_key` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `schools_city_name_key` (`city_id`, `name_key`),
  KEY `schools_province_idx` (`province_id`, `city_id`),

  CONSTRAINT `schools_creator_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  CONSTRAINT `schools_province_format_check` CHECK (`province_id` REGEXP '^IR[0-9]{3}$'),
  CONSTRAINT `schools_city_format_check`
    CHECK (`city_id` REGEXP '^IR[0-9]{6}$' AND LEFT(`city_id`, 5) = `province_id`),
  CONSTRAINT `schools_name_check` CHECK (CHAR_LENGTH(TRIM(`name`)) BETWEEN 2 AND 120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۵ — کلاس
-- =============================================================================

CREATE TABLE `teacher_classes` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `teacher_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `school_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `name` VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `grade` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ کدِ عضویت — تنها راهِ پیوستن به کلاس (بندِ «نکات امنیتی»).
  --
  -- حروفِ مبهم (`I`، `O`، `0`، `1`) عمداً در الفبای تولیدش نیستند؛ کد قرار
  -- است روی تخته نوشته و از رویش تایپ شود. تولیدش در
  -- `lib/teacher/join-code.ts`.
  --
  -- ⚠️ یکتاییِ *سراسری* و نه به‌ازای هر دبیر: دانش‌آموز فقط کد را وارد
  -- می‌کند و نمی‌داند مالِ کدام دبیر است، پس کد باید به‌تنهایی یک کلاس را
  -- مشخص کند.
  `join_code` VARCHAR(10) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `is_active` TINYINT(1) NOT NULL DEFAULT 1,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_classes_join_code_key` (`join_code`),
  KEY `teacher_classes_teacher_idx` (`teacher_id`, `created_at` DESC),
  KEY `teacher_classes_school_idx` (`school_id`),

  -- ⚠️ حذفِ حسابِ دبیر، کلاس‌هایش را هم می‌برد. عمدی: کلاسِ بی‌دبیر چیزی
  -- نیست که کسی بتواند مدیریتش کند، و اعضایش با cascadeِ بعدی می‌روند.
  CONSTRAINT `teacher_classes_teacher_fk`
    FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  -- ⚠️ ولی مدرسه **RESTRICT** است و نه CASCADE: مدرسه‌ای که کلاسِ زنده دارد
  -- نباید حذف شود. (امروز هیچ مسیری مدرسه را حذف نمی‌کند؛ این خط برای فردا
  -- نوشته شده.)
  CONSTRAINT `teacher_classes_school_fk`
    FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),

  CONSTRAINT `teacher_classes_grade_check` CHECK (`grade` IN ('10', '11', '12')),
  CONSTRAINT `teacher_classes_name_check` CHECK (CHAR_LENGTH(TRIM(`name`)) BETWEEN 2 AND 60),
  CONSTRAINT `teacher_classes_join_code_check` CHECK (`join_code` REGEXP '^[A-Z2-9]{6,10}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۶ — عضویتِ دانش‌آموز در کلاس
-- =============================================================================
--
-- ⚠️ جدولِ جدا و نه یک ستونِ `class_id` روی `users`.
--
-- یک دانش‌آموز می‌تواند هم‌زمان در کلاسِ ادبیاتِ مدرسه و کلاسِ تقویتیِ یک
-- دبیرِ دیگر باشد. با یک ستون روی `users`، دومی اولی را پاک می‌کرد.

CREATE TABLE `class_members` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `class_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `student_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ `removed` یعنی ردیف می‌ماند و فقط خاموش می‌شود.
  --
  -- حذفِ واقعی دو چیز را خراب می‌کرد: دانش‌آموزی که دبیر بیرونش گذاشته
  -- می‌توانست با همان کد دوباره وارد شود و دبیر متوجه نشود، و سابقهٔ «این
  -- نفر در این بازه عضو بود» — که تنها مبنای درستِ خواندنِ عملکردِ گذشته‌اش
  -- است — از بین می‌رفت.
  `status` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'active',

  `joined_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `left_at` DATETIME(6) NULL,

  PRIMARY KEY (`id`),
  -- یک ردیف برای هر (کلاس، دانش‌آموز) — چه فعال و چه خارج‌شده. پیوستنِ
  -- دوباره همان ردیف را زنده می‌کند و ردیفِ دوم نمی‌سازد.
  UNIQUE KEY `class_members_unique` (`class_id`, `student_id`),
  KEY `class_members_class_idx` (`class_id`, `status`),
  KEY `class_members_student_idx` (`student_id`, `status`),

  CONSTRAINT `class_members_class_fk`
    FOREIGN KEY (`class_id`) REFERENCES `teacher_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_members_student_fk`
    FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,

  CONSTRAINT `class_members_status_check` CHECK (`status` IN ('active', 'removed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۷ — اشتراکِ دبیرِ تأییدشده
-- =============================================================================
--
-- بند ۸ می‌گوید تأییدِ مدیر باید اشتراکِ مادام‌العمر روشن کند، با نوعِ
-- `teacher_verified`.
--
-- ⚠️ مقدارِ سومِ `source` و نه استفاده از `manual_grant`.
--
-- وسوسه‌اش این بود که همان `manual_grant` استفاده شود و در `reason` بنویسیم
-- «دبیرِ تأییدشده». غلط بود: `lib/plus/entitlement.ts` از روی همین ستون
-- تصمیم می‌گیرد که اشتراک «آزمایشی» است یا نه، و نتیجه‌اش این می‌شد که
-- صفحهٔ اشتراکِ هر دبیر می‌نوشت «دسترسی آزمایشی سروا پلاس روشن است» — برای
-- چیزی که نه آزمایشی است و نه تمام می‌شود.
--
-- `reason` هم مبنای تصمیم نیست و نباید بشود: یک متنِ آزادِ فارسی که مدیر
-- می‌نویسد، هر روز می‌تواند عوض شود. `source` یک مقدارِ بسته است که دیتابیس
-- نگهبانش است.
ALTER TABLE `plus_entitlements` DROP CONSTRAINT `plus_entitlements_source_check`;
ALTER TABLE `plus_entitlements`
  ADD CONSTRAINT `plus_entitlements_source_check`
  CHECK (`source` IN ('purchase', 'manual_grant', 'teacher_verified'));


-- =============================================================================
-- بخش ۸ — دو نوعِ تازهٔ اعلان
-- =============================================================================
--
-- ⚠️ چرا نمی‌شد از نوع‌های موجود استفاده کرد:
--
-- وسوسهٔ اول این بود که تأیید را `plus_activated` و رد را `plus_revoked`
-- بنویسیم — هر دو از قبل در CHECK بودند و کار می‌کردند. هر دو هم غلط بودند:
--
--   • `plus_activated` کارتِ خوش‌آمدگوییِ سروا پلاس را روشن می‌کند
--     (`getUnreadWelcome` دقیقاً همین دو نوع را می‌خواند). یعنی دبیری که
--     تازه تأیید شده، به‌جای پیامِ «حساب دبیری‌ات فعال شد»، onboardingِ
--     خریدِ پلاس را می‌دید.
--
--   • `plus_revoked` برای *ردِ درخواست* یک دروغِ ساده است: هیچ دسترسی‌ای لغو
--     نشده. شش ماه بعد که کسی این جدول را برای «چند نفر دسترسی‌شان لغو شد»
--     بخواند، عددش غلط درمی‌آید و هیچ‌کس نمی‌فهمد چرا.
--
-- نوعِ اعلان داده است و نه تزئین؛ پس دو مقدارِ تازه اضافه می‌شود.
ALTER TABLE `plus_notifications` DROP CONSTRAINT `plus_notifications_kind_check`;
ALTER TABLE `plus_notifications`
  ADD CONSTRAINT `plus_notifications_kind_check`
  CHECK (`kind` IN ('plus_activated', 'plus_renewed', 'plus_expiring', 'plus_expired',
                    'plus_revoked', 'ticket_reply', 'payment_action_needed',
                    'teacher_approved', 'teacher_rejected'));
