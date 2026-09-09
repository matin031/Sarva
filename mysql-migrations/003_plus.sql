-- =============================================================================
-- ۰۰۳ — هستهٔ تجاریِ «سروا پلاس» و سیگنال‌های تمرین (MySQL / MariaDB)
-- =============================================================================
-- برخلاف ۰۰۱ این فایل دست‌نویس است: چیزی برای ترجمهٔ مکانیکی وجود نداشت،
-- این جدول‌ها از ابتدا برای همین موتور نوشته شده‌اند.
--
-- پنج مفهومِ *مستقل* که در اکثر پیاده‌سازی‌ها به‌اشتباه یکی می‌شوند:
--
--   ۱) Plan / PlanVersion — «چه چیزی فروخته می‌شود و به چه قیمتی».
--   ۲) Order              — «کاربر اقدام به خرید کرد؛ نتیجهٔ مالی چه شد».
--   ۳) PaymentAttempt     — «یک رفت‌وبرگشت با درگاه». یک سفارش می‌تواند چند
--                            تلاش داشته باشد.
--   ۴) Entitlement        — «آیا کاربر *همین حالا* اجازهٔ استفاده دارد».
--                            تنها منبعِ حقیقتِ دسترسی.
--   ۵) Ticket             — پشتیبانیِ محصول پولی.
--
-- ⚠️ چرا وجودِ یک سفارشِ موفق جای entitlement را نمی‌گیرد: «دسترسی» یک بازهٔ
-- زمانی است، نه یک رویداد. تمدید، هدیهٔ دستیِ مدیر، دورهٔ آزمایشی و لغو
-- دسترسی هیچ‌کدام سفارش نیستند — ولی همه‌شان دسترسی‌اند.
--
-- ── پول ──────────────────────────────────────────────────────────────────────
-- واحدِ متعارف **ریال** است و در `BIGINT` نگه داشته می‌شود. هیچ ستون پولی
-- اعشاری نیست و هیچ‌جای دیتابیس تومان ذخیره نمی‌شود؛ تبدیل دقیقاً یک بار و
-- در `lib/plus/money.ts` انجام می‌شود.
--
-- ⚠️ `lib/db` برای LONGLONG مبدلِ Number دارد و اگر عدد از مرزِ امنِ JS رد
-- شود هشدار می‌دهد. بزرگ‌ترین مبلغِ قابلِ تصور اینجا چند ده میلیون ریال است،
-- یعنی ۹ مرتبهٔ بزرگی فاصله.
--
-- ── قراردادهای این اسکیما (هم‌شکلِ ۰۰۱) ──────────────────────────────────────
--   • شناسه: CHAR(36) اسکی، **بدون DEFAULT**. اپ با crypto.randomUUID
--     می‌سازدش و در INSERT صریح می‌نویسد — همان کاری که بقیهٔ جدول‌ها
--     می‌کنند.
--   • زمان: DATETIME(6) و همیشه UTC. نمایشِ شمسی/تهران در لایهٔ رابط کاربری.
--   • بولی: TINYINT(1)، که `lib/db` خودش به boolean واقعی تبدیلش می‌کند.
--   • آرایه: JSON. (MySQL نوعِ آرایه ندارد.)
--
-- ── سه چیزی که در PostgreSQL یک خط بود و اینجا نیست ─────────────────────────
-- این سه، مهم‌ترین تفاوت‌های این فایل با نسخهٔ Postgres همین feature اند و
-- هرکدام راه‌حلِ خودش را دارد. جزئیات کنارِ خودشان نوشته شده:
--   • ایندکس یکتای *جزئی* → ستونِ کمکیِ nullable + ایندکس یکتا (چون MySQL در
--     ایندکس یکتا NULL ها را متمایز می‌شمارد)، که تریگرهای ۰۰۴ پرش می‌کنند.
--   • `sequence` → ستونِ AUTO_INCREMENT، و قالب‌بندیِ شمارهٔ خوانا در اپ.
--   • `on conflict … do nothing` → قفلِ ردیفِ کاربر + همان ایندکسِ یکتا.
-- =============================================================================


-- =============================================================================
-- بخش ۱ — محصول
-- =============================================================================

-- یک «پلن» یک گونهٔ فروشِ سروا پلاس است — مثلاً یک‌ماهه و سه‌ماهه.
--
-- ⚠️ اینجا Tier نیست. نقره‌ای/طلایی/VIP ساخته نمی‌شود: محصول یک چیز است
-- و این ردیف‌ها فقط *مدت*های فروشِ همان یک چیزند.
CREATE TABLE `plus_plans` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- شناسهٔ پایدارِ کد (`plus_1m`). URL و تست‌ها به این می‌چسبند، نه به uuid.
  `code` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `title` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `subtitle` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  -- مدتِ دسترسی. روز است و نه ماه: «یک ماه» در تقویم شمسی ۲۹ تا ۳۱ روز است و
  -- اگر ماه ذخیره می‌شد، محاسبهٔ پایانِ دوره به تقویم وابسته می‌شد.
  `duration_days` INT NOT NULL,

  `sort_index` INT NOT NULL DEFAULT 0,

  -- از کاتالوگ برداشته می‌شود ولی سفارش‌های قدیمی‌اش سر جایشان می‌مانند.
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `plus_plans_code_key` (`code`),
  KEY `plus_plans_catalog_idx` (`is_active`, `sort_index`, `code`),

  CONSTRAINT `plus_plans_code_check` CHECK (`code` REGEXP '^[a-z0-9_]{2,40}$'),
  CONSTRAINT `plus_plans_duration_check` CHECK (`duration_days` BETWEEN 1 AND 3650),
  CONSTRAINT `plus_plans_title_check` CHECK (CHAR_LENGTH(TRIM(`title`)) BETWEEN 1 AND 120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- نسخهٔ قیمتیِ یک پلن.
--
-- ⚠️ چرا نسخه‌بندی، به‌جای یک ستونِ `price` روی خودِ پلن: فردا قیمت عوض
-- می‌شود. اگر قیمت روی پلن بود، `UPDATE` آن *گذشته* را هم بازنویسی می‌کرد —
-- هر گزارشِ مالی و هر فاکتورِ کسی که سه ماه پیش خریده، عددِ امروز را نشان
-- می‌داد.
CREATE TABLE `plus_plan_versions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `plan_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `version` INT NOT NULL,

  -- snapshot عنوان و مدت در لحظهٔ ساختِ نسخه. اگر مدیر فردا عنوانِ پلن را
  -- عوض کند، فاکتورِ دیروز همان چیزی را نشان می‌دهد که کاربر خریده بود.
  `title` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `duration_days` INT NOT NULL,

  -- ⚠️ ریال. تومان هرگز در این ستون نمی‌نشیند.
  `amount_rials` BIGINT NOT NULL,
  `currency` VARCHAR(3) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'IRR',

  -- «الان قابل فروش است؟» — نسخهٔ قدیمی از فروش خارج می‌شود ولی حذف نمی‌شود.
  `is_sellable` TINYINT(1) NOT NULL DEFAULT 0,

  -- ⚠️ ستونِ کمکی، فقط برای ساختنِ «حداکثر یک نسخهٔ فروشیِ هر پلن».
  --
  -- در PostgreSQL این یک ایندکس یکتای *جزئی* بود
  -- (`unique (plan_id) where is_sellable`). MySQL ایندکس جزئی ندارد، ولی در
  -- ایندکس یکتا NULL ها را متمایز می‌شمارد — پس ستونی که فقط برای ردیفِ
  -- فروشی مقدار دارد و برای بقیه NULL است، دقیقاً همان معنا را می‌دهد.
  --
  -- ⚠️ و چرا ستونِ *تولیدشده* نیست: MariaDB اجازهٔ `IF`/`CASE` در
  -- `GENERATED ALWAYS AS` نمی‌دهد (خطای ۱۹۰۱)، هرچند MySQL 8 می‌دهد. چون هر
  -- دو باید کار کنند، مقدارش را یک تریگرِ تک‌خطی در ۰۰۴ می‌نویسد — پس
  -- همچنان دیتابیس نگهبانش است و نه کدِ برنامه.
  --
  -- بدون این، دو نسخهٔ فعال یعنی «قیمت این پلن چند است؟» پاسخِ قطعی ندارد و
  -- دو کاربر در یک لحظه دو قیمتِ متفاوت می‌بینند.
  `sellable_plan_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `note` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `plus_plan_versions_plan_version_key` (`plan_id`, `version`),
  UNIQUE KEY `plus_plan_versions_one_sellable_key` (`sellable_plan_id`),
  KEY `plus_plan_versions_plan_idx` (`plan_id`, `version` DESC),

  CONSTRAINT `plus_plan_versions_plan_fk`
    FOREIGN KEY (`plan_id`) REFERENCES `plus_plans` (`id`),
  CONSTRAINT `plus_plan_versions_creator_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  CONSTRAINT `plus_plan_versions_version_check` CHECK (`version` >= 1),
  CONSTRAINT `plus_plan_versions_duration_check` CHECK (`duration_days` BETWEEN 1 AND 3650),
  CONSTRAINT `plus_plan_versions_amount_check` CHECK (`amount_rials` >= 0),
  CONSTRAINT `plus_plan_versions_currency_check` CHECK (`currency` IN ('IRR'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۲ — سفارش
-- =============================================================================

CREATE TABLE `plus_orders` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ شمارهٔ خواناى سفارش از این عدد ساخته می‌شود («SRV-001040») ولی *در
  -- اپ*، نه در دیتابیس.
  --
  -- در PostgreSQL یک `sequence` بود. MySQL 8 معادلی ندارد (MariaDB دارد ولی
  -- هر دو باید کار کنند)، پس AUTO_INCREMENT جایش را می‌گیرد: همان تضمینِ
  -- یکتاییِ اتمیک، بدون قفلِ دستی و بدون جدولِ شمارنده.
  --
  -- چرا خودِ رشته ذخیره نمی‌شود: AUTO_INCREMENT را نه DEFAULT می‌بیند و نه
  -- ستونِ تولیدشده، و تریگرِ BEFORE INSERT هم هنوز مقدارش را ندارد. تنها
  -- راهِ ذخیره‌اش یک نوشتنِ دومِ بی‌دلیل بود. قالب‌بندی در
  -- `lib/plus/order-number.ts` است و تست دارد.
  `order_seq` BIGINT NOT NULL AUTO_INCREMENT,

  -- ⚠️ cascade: حذفِ حساب، سفارش‌هایش را هم می‌برد. با بقیهٔ اسکیما هماهنگ
  -- است ولی یک انتخاب است نه بدیهیات: اگر روزی نگه‌داشتنِ سابقهٔ مالیِ حسابِ
  -- حذف‌شده لازم شد، راهش RESTRICT به‌علاوهٔ ناشناس‌سازی است.
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `plan_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `plan_version_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- snapshot: همان چیزی که در لحظهٔ خرید به کاربر نشان داده شد.
  `plan_code` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `plan_title` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `plan_version` INT NOT NULL,
  `duration_days` INT NOT NULL,
  `amount_rials` BIGINT NOT NULL,
  `currency` VARCHAR(3) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'IRR',

  `status` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'pending',

  `paid_at` DATETIME(6) NULL,
  `cancelled_at` DATETIME(6) NULL,

  -- سفارشِ رهاشده تا ابد «در انتظار پرداخت» نمی‌ماند؛ سیاستش در
  -- `lib/plus/orders.ts` است، نه اینجا.
  `pending_expires_at` DATETIME(6) NULL,

  -- کلیدِ idempotency ای که کلاینت می‌سازد؛ لایهٔ دومِ محافظت.
  `idempotency_key` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  -- ⚠️ ستونِ فقراتِ idempotency خرید.
  --
  -- سناریوها: دوبار کلیک، رفرشِ صفحهٔ پرداخت، دکمهٔ back، دو تبِ باز. بدونِ
  -- این، هرکدام یک سفارشِ تازه می‌ساخت و کاربر در «خریدهای من» چهار سفارشِ
  -- در انتظار پرداخت می‌دید و نمی‌دانست کدام را بپردازد.
  --
  -- قاعده: در هر لحظه حداکثر **یک** سفارشِ باز برای هر (کاربر، نسخهٔ پلن).
  -- همان ترفندِ بالا: ستونی که فقط برای سفارشِ `pending` مقدار دارد و یک
  -- تریگرِ تک‌خطی در ۰۰۴ نگهش می‌دارد (چرایش کنارِ `sellable_plan_id`).
  `open_plan_version_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `plus_orders_seq_key` (`order_seq`),
  UNIQUE KEY `plus_orders_one_open_key` (`user_id`, `open_plan_version_id`),
  UNIQUE KEY `plus_orders_idempotency_key` (`user_id`, `idempotency_key`),
  KEY `plus_orders_user_idx` (`user_id`, `created_at` DESC, `id`),
  KEY `plus_orders_status_idx` (`status`, `created_at` DESC),
  KEY `plus_orders_plan_version_idx` (`plan_version_id`),
  KEY `plus_orders_plan_idx` (`plan_id`),

  CONSTRAINT `plus_orders_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `plus_orders_plan_fk`
    FOREIGN KEY (`plan_id`) REFERENCES `plus_plans` (`id`),
  CONSTRAINT `plus_orders_plan_version_fk`
    FOREIGN KEY (`plan_version_id`) REFERENCES `plus_plan_versions` (`id`),

  CONSTRAINT `plus_orders_status_check`
    CHECK (`status` IN ('pending', 'paid', 'cancelled', 'expired', 'refunded')),
  CONSTRAINT `plus_orders_duration_check` CHECK (`duration_days` BETWEEN 1 AND 3650),
  CONSTRAINT `plus_orders_amount_check` CHECK (`amount_rials` >= 0),
  CONSTRAINT `plus_orders_currency_check` CHECK (`currency` IN ('IRR')),
  CONSTRAINT `plus_orders_idempotency_check`
    CHECK (`idempotency_key` IS NULL OR CHAR_LENGTH(`idempotency_key`) BETWEEN 8 AND 80),

  -- ⚠️ نظمِ حالت‌ها: سفارشِ paid باید زمانِ پرداخت داشته باشد و برعکس. بدون
  -- این، یک باگ می‌تواند سفارشی بسازد که «پرداخت‌شده» است ولی هیچ‌کس
  -- نمی‌داند کِی — و آن‌وقت گزارشِ مالی و بازهٔ دسترسی با هم نمی‌خوانند.
  CONSTRAINT `plus_orders_paid_has_time`
    CHECK ((`status` = 'paid') = (`paid_at` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC
  AUTO_INCREMENT=1001;


-- =============================================================================
-- بخش ۳ — تلاشِ پرداخت
-- =============================================================================

-- ⚠️ چرا جدا از سفارش: یک سفارش می‌تواند چند بار پرداخت شود و *نتیجهٔ
-- هیچ‌کدام قطعی نیست*. مهم‌ترین حالت‌ها آن‌هایی‌اند که اکثر پیاده‌سازی‌ها
-- ندارند:
--
--   • `pending` — درگاه گفته «هنوز تمام نشده».
--   • `unknown` — ما نمی‌دانیم. تایم‌اوت شبکه، پاسخِ نامفهوم، قطعیِ وسطِ
--     verify. این حالت **شکست نیست** و هرگز نباید «پرداخت ناموفق» نمایش
--     داده شود؛ پولِ کاربر ممکن است کم شده باشد.
CREATE TABLE `plus_payment_attempts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- نامِ آداپتور. هرگز کلید یا رازِ درگاه اینجا نمی‌نشیند.
  `provider` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'created',

  `amount_rials` BIGINT NOT NULL,

  -- شناسهٔ درگاه برای این تلاش (authority/token). با آن می‌شود بعداً وضعیت
  -- را پرسید — همان چیزی که «اینترنتِ کاربر وسطِ پرداخت قطع شد» را قابلِ
  -- ترمیم می‌کند.
  `provider_ref` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  -- شمارهٔ پیگیریِ قابلِ نمایش به کاربر (بعد از تأیید).
  `provider_tracking_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  -- ⚠️ فقط کدِ خطا و پیامِ کوتاهِ درگاه. بدنهٔ خامِ پاسخ اینجا نمی‌نشیند: در
  -- آن بدنه ممکن است هدر، توکن یا شناسهٔ پذیرنده باشد.
  `error_code` VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `error_message` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  `redirected_at` DATETIME(6) NULL,
  `verified_at` DATETIME(6) NULL,
  `failed_at` DATETIME(6) NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  -- شناسهٔ درگاه در هر درگاه یکتاست: callbackِ تکراری نمی‌تواند تلاشِ دوم
  -- بسازد. (NULL ها متمایزند، پس تلاشی که هنوز به درگاه نرسیده آزاد است.)
  UNIQUE KEY `plus_payment_attempts_ref_key` (`provider`, `provider_ref`),
  KEY `plus_payment_attempts_order_idx` (`order_id`, `created_at` DESC),
  KEY `plus_payment_attempts_state_idx` (`state`, `created_at` DESC),

  CONSTRAINT `plus_payment_attempts_order_fk`
    FOREIGN KEY (`order_id`) REFERENCES `plus_orders` (`id`) ON DELETE CASCADE,

  CONSTRAINT `plus_payment_attempts_state_check`
    CHECK (`state` IN ('created', 'redirected', 'pending', 'verified', 'failed', 'cancelled', 'unknown')),
  CONSTRAINT `plus_payment_attempts_amount_check` CHECK (`amount_rials` >= 0),
  CONSTRAINT `plus_payment_attempts_provider_check`
    CHECK (CHAR_LENGTH(TRIM(`provider`)) BETWEEN 1 AND 40)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۴ — Entitlement: تنها منبعِ حقیقتِ دسترسی
-- =============================================================================

-- ⚠️ `ends_at` می‌تواند NULL باشد و معنایش «دائمی» است. مالک صریحاً خواسته
-- بتواند حسابی را «همیشگی» پلاس کند. NULL بهتر از یک تاریخِ خیلی دور است:
-- در کوئری صادق است و در رابط کاربری هم می‌شود صریح نوشت «دائمی» — به‌جای
-- «تا سال ۲۵۰۰» که مثل یک باگ به‌نظر می‌رسد.
--
-- ⚠️ مرزِ بازه نیم‌باز است: `starts_at <= now < ends_at`. یعنی لحظهٔ پایان
-- دیگر دسترسی نیست، و تمدیدی که از همان لحظه شروع شود نه شکاف می‌سازد و نه
-- همپوشانی.
CREATE TABLE `plus_entitlements` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `source` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- سفارشی که این دسترسی از آن آمده. برای هدیهٔ دستی NULL است.
  --
  -- ⚠️ **ستونِ فقراتِ idempotency پرداخت.** یک سفارش حداکثر یک دسترسی
  -- می‌سازد، و چون MySQL در ایندکس یکتا NULL ها را متمایز می‌شمارد، همین
  -- یک UNIQUE دقیقاً همان ایندکسِ جزئیِ Postgres است. یعنی:
  --   • callback درگاه دوبار برسد → ردیفِ دوم نوشته نمی‌شود.
  --   • کاربر صفحهٔ نتیجه را سه بار رفرش کند → همان یک ردیف.
  --   • دو تب هم‌زمان verify کنند → یکی برنده، دیگری خطای یکتایی می‌گیرد و
  --     کدِ بالادست آن را «قبلاً فعال شده» می‌فهمد.
  `source_order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `starts_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ends_at` DATETIME(6) NULL,

  `revoked_at` DATETIME(6) NULL,

  -- برای هدیهٔ دستی اجباری است (در کد)، برای خرید توضیحِ اختیاری.
  `reason` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `granted_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `plus_entitlements_order_key` (`source_order_id`),
  -- کوئریِ داغِ سایت: «این کاربر همین حالا پلاس دارد؟»
  KEY `plus_entitlements_user_idx` (`user_id`, `revoked_at`, `ends_at`),
  KEY `plus_entitlements_expiry_idx` (`revoked_at`, `ends_at`),

  CONSTRAINT `plus_entitlements_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `plus_entitlements_order_fk`
    FOREIGN KEY (`source_order_id`) REFERENCES `plus_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `plus_entitlements_granter_fk`
    FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  CONSTRAINT `plus_entitlements_source_check`
    CHECK (`source` IN ('purchase', 'manual_grant')),
  CONSTRAINT `plus_entitlements_range_check`
    CHECK (`ends_at` IS NULL OR `ends_at` > `starts_at`)

  -- ⚠️ در نسخهٔ Postgres یک CHECK سومی هم بود:
  --
  --     check (source <> 'purchase' or source_order_id is not null)
  --
  -- MariaDB آن را نمی‌پذیرد (خطای ۱۹۰۱) و **حق دارد**: `source_order_id` یک
  -- کلید خارجی با `ON DELETE SET NULL` است، پس حذفِ سفارش خودبه‌خود آن را
  -- NULL می‌کند و CHECK را نقض. Postgres همین ترکیب را می‌پذیرفت و به‌جایش
  -- سرِ *حذف* خطا می‌داد — یعنی خرابی را به دیرتر موکول می‌کرد.
  --
  -- بین این دو، `ON DELETE SET NULL` مهم‌تر است: اگر روزی ردیفِ سفارش از بین
  -- برود، دسترسی‌ای که کاربر پولش را داده نباید با آن برود. پس CHECK کنار
  -- گذاشته شد و همان قاعده در `lib/plus/grants.ts` می‌ماند (تنها جایی که
  -- ردیفِ دسترسی ساخته می‌شود و همیشه با orderId صدا زده می‌شود).
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۵ — اعلان‌های درون‌سایتی
-- =============================================================================

-- کوچک و عمدی: این یک «سامانهٔ نوتیفیکیشن» نیست. ایمیل و پیامک هم اینجا
-- نیست — بدونِ رضایتِ کاربر و بدونِ provider، پیامِ خارجی فرستاده نمی‌شود.
CREATE TABLE `plus_notifications` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `kind` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `title` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `body` VARCHAR(600) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  -- مسیرِ داخلیِ سایت. هرگز آدرس بیرونی — وگرنه اعلان می‌شود یک بردارِ
  -- فیشینگ که خودِ سایت نمایشش می‌دهد.
  `href` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  -- «این اعلان قبلاً برای این کاربر ساخته شده؟» — تا هشدارِ «نزدیک پایان»
  -- هر بار که کاربر صفحه را باز می‌کند دوباره ساخته نشود.
  `dedupe_key` VARCHAR(120) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `read_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `plus_notifications_dedupe_key` (`user_id`, `dedupe_key`),
  KEY `plus_notifications_user_idx` (`user_id`, `created_at` DESC),
  KEY `plus_notifications_unread_idx` (`user_id`, `read_at`, `created_at` DESC),

  CONSTRAINT `plus_notifications_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,

  CONSTRAINT `plus_notifications_kind_check`
    CHECK (`kind` IN ('plus_activated', 'plus_renewed', 'plus_expiring', 'plus_expired',
                      'plus_revoked', 'ticket_reply', 'payment_action_needed')),
  CONSTRAINT `plus_notifications_title_check`
    CHECK (CHAR_LENGTH(TRIM(`title`)) BETWEEN 1 AND 160),
  CONSTRAINT `plus_notifications_href_check`
    CHECK (`href` IS NULL OR `href` REGEXP '^/[^/\\\\]')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۶ — پشتیبانی
-- =============================================================================

-- ⚠️ این جدول جایگزینِ `content_reports` نیست و نباید بشود:
--   • `content_reports` = «این سؤال/بیت غلط است» — دربارهٔ یک محتوای مشخص،
--     با جریانِ کاریِ ویراستاری.
--   • `plus_tickets`    = «مشکلِ من با حساب/پرداخت/اشتراک» — گفت‌وگوی
--     دوطرفهٔ کاربرِ مشخص با پشتیبانی.
-- اگر یکی می‌شدند، صفِ ویراستار پر می‌شد از سؤالِ پرداخت.
CREATE TABLE `plus_tickets` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- مثل سفارش: عدد اینجا، قالب‌بندیِ «TK-001040» در اپ.
  `ticket_seq` BIGINT NOT NULL AUTO_INCREMENT,

  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `category` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `subject` VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` VARCHAR(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'open',

  -- سفارشِ مرتبط، اگر کاربر یکی را ضمیمه کرده باشد.
  -- ⚠️ مالکیتِ این سفارش در کد بررسی می‌شود: بدون آن، کاربر می‌توانست شناسهٔ
  -- سفارشِ کسِ دیگری را ضمیمه کند و پشتیبان — با حسن‌نیت — اطلاعاتِ مالیِ یک
  -- نفرِ سوم را در پاسخ بنویسد.
  `order_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `last_activity_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `user_unread` TINYINT(1) NOT NULL DEFAULT 0,
  `admin_unread` TINYINT(1) NOT NULL DEFAULT 1,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `plus_tickets_seq_key` (`ticket_seq`),
  KEY `plus_tickets_user_idx` (`user_id`, `last_activity_at` DESC, `id`),
  KEY `plus_tickets_queue_idx` (`status`, `last_activity_at` DESC, `id`),
  KEY `plus_tickets_admin_unread_idx` (`admin_unread`, `last_activity_at` DESC),
  KEY `plus_tickets_order_idx` (`order_id`),

  CONSTRAINT `plus_tickets_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `plus_tickets_order_fk`
    FOREIGN KEY (`order_id`) REFERENCES `plus_orders` (`id`) ON DELETE SET NULL,

  CONSTRAINT `plus_tickets_category_check`
    CHECK (`category` IN ('payment', 'plus', 'account', 'technical', 'content', 'other')),
  CONSTRAINT `plus_tickets_status_check`
    CHECK (`status` IN ('open', 'waiting_for_support', 'waiting_for_user', 'resolved', 'closed')),
  CONSTRAINT `plus_tickets_subject_check`
    CHECK (CHAR_LENGTH(TRIM(`subject`)) BETWEEN 3 AND 160)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC
  AUTO_INCREMENT=1001;


CREATE TABLE `plus_ticket_messages` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `ticket_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- NULL یعنی نویسنده حذف شده؛ متن پیام می‌ماند چون رشتهٔ گفت‌وگو بدونِ آن
  -- بی‌معنی می‌شود.
  `author_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `author_role` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `body` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  KEY `plus_ticket_messages_thread_idx` (`ticket_id`, `created_at`, `id`),
  KEY `plus_ticket_messages_author_idx` (`author_id`),

  CONSTRAINT `plus_ticket_messages_ticket_fk`
    FOREIGN KEY (`ticket_id`) REFERENCES `plus_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `plus_ticket_messages_author_fk`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  CONSTRAINT `plus_ticket_messages_role_check`
    CHECK (`author_role` IN ('user', 'admin')),
  CONSTRAINT `plus_ticket_messages_body_check`
    CHECK (CHAR_LENGTH(TRIM(`body`)) BETWEEN 1 AND 4000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- =============================================================================
-- بخش ۷ — سیگنال‌های تمرین
-- =============================================================================
--
-- ⚠️ چرا این دو جدول بخشی از سروا پلاس‌اند:
--
-- ارزشِ اصلیِ پلاس یک جملهٔ ساده است — «بدان چه چیزی را باید مرور کنی». آن
-- جمله فقط به اندازهٔ داده‌ای که پشتش است راست می‌گوید. از چهار تمرینی که وزن
-- و نقشِ دستوری را می‌سنجند، فقط دوتایشان ردی از خودشان می‌گذاشتند:
--
--   • عروضِ سماعی → `user_answers`      ✓
--   • جاسوس        → `jasoos_answers`    ✓
--   • پلِ وزن       → هیچ‌جا             ✗
--   • مدارِ دستور   → هیچ‌جا             ✗
--
-- یعنی دانش‌آموزی که دویست دور «پلِ وزن» بازی کرده و همیشه روی «مفاعیلن»
-- می‌افتد، در هر تحلیلی نامرئی بود. تحلیلی که نصفِ شواهد را ندیده، بدتر از
-- نداشتنِ تحلیل است: با اطمینان چیز اشتباهی پیشنهاد می‌دهد.
--
-- ⚠️ درستی سمتِ سرور سنجیده می‌شود. برخلاف `vocab_answers` (که گزینه‌هایش در
-- مرورگر ساخته می‌شوند و سرور راهی برای بازسنجی ندارد)، هر دو بازیِ اینجا
-- مرجعِ سروری دارند، پس route های ثبت `is_correct` را از کلاینت نمی‌پذیرند.

CREATE TABLE `aruz_bridge_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ SET NULL و نه CASCADE: اگر مدیر پرسشی را حذف کند، تاریخچهٔ تمرینِ
  -- دانش‌آموز نباید ناپدید شود. برای همین همه‌چیزِ لازمِ تحلیل به‌صورت
  -- snapshot در همین ردیف هست.
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  `phrase` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- ⚠️ بُعدِ اصلیِ تحلیل. «دانش‌آموز در کدام وزن ضعیف است» یعنی گروه‌بندی روی
  -- همین ستون؛ پس snapshot است و نه join.
  `correct_pattern` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- NULL فقط وقتی که وقت تمام شده و بازیکن اصلاً انتخابی نکرده.
  `chosen_pattern` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,

  `outcome` VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ستونِ مشتق ولی عمدی: کوئریِ تحلیل رویش فیلتر می‌کند، و constraint پایین
  -- تضمین می‌کند این دو هرگز از هم جدا نیفتند.
  `is_correct` TINYINT(1) NOT NULL,

  `difficulty` SMALLINT NULL,

  `answered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  KEY `aruz_bridge_answers_user_idx` (`user_id`, `answered_at` DESC),
  -- کوئریِ تحلیل: «ضعیف‌ترین وزن‌های این کاربر».
  KEY `aruz_bridge_answers_weight_idx` (`user_id`, `correct_pattern`, `answered_at` DESC),
  KEY `aruz_bridge_answers_question_idx` (`question_id`),

  CONSTRAINT `aruz_bridge_answers_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `aruz_bridge_answers_question_fk`
    FOREIGN KEY (`question_id`) REFERENCES `aruz_bridge_questions` (`id`) ON DELETE SET NULL,

  CONSTRAINT `aruz_bridge_answers_outcome_check`
    CHECK (`outcome` IN ('correct', 'wrong', 'timeout')),
  CONSTRAINT `aruz_bridge_answers_difficulty_check`
    CHECK (`difficulty` IS NULL OR `difficulty` BETWEEN 1 AND 3),
  CONSTRAINT `aruz_bridge_answers_outcome_matches`
    CHECK ((`is_correct` = 1) = (`outcome` = 'correct')),
  -- پاسخِ درست بدون انتخاب ممکن نیست؛ timeout با انتخاب هم بی‌معنی است.
  CONSTRAINT `aruz_bridge_answers_choice_matches`
    CHECK ((`outcome` = 'timeout') = (`chosen_pattern` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;


-- یک ردیف به‌ازای هر *سوکت* (نه هر سؤال): بازیکن در یک سؤال ممکن است «نهاد»
-- را درست بگذارد و «متمم» را غلط. اگر نتیجه در سطحِ سؤال ثبت می‌شد، دقیقاً
-- همان چیزی که تحلیل به آن نیاز دارد — «کدام نقش» — گم می‌شد.
CREATE TABLE `grammar_circuit_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,

  -- پایه و درس، برای پیشنهادِ «کدام درس را مرور کن».
  `grade` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `lesson` SMALLINT NULL,

  `token_text` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  -- ⚠️ بُعدِ اصلیِ تحلیل: کلیدِ نقشِ درست (`subject`, `object`, …) و نه
  -- برچسبِ فارسی. برچسب‌ها هر وقت لازم شد عوض می‌شوند؛ کلیدها قراردادِ
  -- داده‌اند.
  --
  -- اگر سوکت چند نقش را می‌پذیرد، اولین عضو برچسبِ متعارفِ سطل است و کلِ
  -- فهرست در `accepted_role_keys` می‌ماند.
  `role_key` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `accepted_role_keys` JSON NOT NULL,

  `chosen_role_key` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  `is_correct` TINYINT(1) NOT NULL,

  `answered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  KEY `grammar_circuit_answers_user_idx` (`user_id`, `answered_at` DESC),
  KEY `grammar_circuit_answers_role_idx` (`user_id`, `role_key`, `answered_at` DESC),
  KEY `grammar_circuit_answers_question_idx` (`question_id`),

  CONSTRAINT `grammar_circuit_answers_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grammar_circuit_answers_question_fk`
    FOREIGN KEY (`question_id`) REFERENCES `grammar_circuit_questions` (`id`) ON DELETE SET NULL,

  CONSTRAINT `grammar_circuit_answers_lesson_check`
    CHECK (`lesson` IS NULL OR `lesson` BETWEEN 1 AND 18)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
