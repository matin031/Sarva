-- =============================================================================
-- ۰۰۶ — هویتِ موبایل: ثبت‌نام، ورود و بازیابی رمز با پیامک
-- =============================================================================
--
-- تا اینجا «ایمیل» تنها راهِ شناختنِ یک کاربر بود. این مهاجرت شماره موبایل را
-- به یک هویتِ **هم‌ردیف** تبدیل می‌کند، نه یک فیلدِ تزئینیِ پروفایل.
--
-- ⚠️ سنگین‌ترین تغییرِ این فایل یک کلمه است: `email` دیگر NOT NULL نیست.
--
-- دلیلش ناگزیر است — کسی که با شماره ثبت‌نام می‌کند ایمیل ندارد، و تا وقتی
-- ستون NOT NULL باشد چنین ردیفی اصلاً ساخته نمی‌شود. ولی همین یک کلمه یعنی
-- هر جایی در کد که `user.email` را یک رشتهٔ قطعی فرض کرده، حالا می‌تواند
-- `null` ببیند. برای همین نوعِ `AuthUser.email` هم در همین تغییر به
-- `string | null` تبدیل می‌شود: کامپایلر هر ۸۸ محلِ استفاده را خودش فهرست
-- می‌کند، و این تنها راهِ قابل اعتماد برای پیدا کردنشان است. گشتن با grep
-- یکی‌شان را جا می‌گذاشت و آن یکی در زمانِ اجرا می‌شکست.
--
-- ⚠️ و در عوض یک CHECK اضافه می‌شود: هر کاربر باید **دست‌کم یکی** از ایمیل یا
-- موبایل را داشته باشد. بدونِ آن، nullable کردنِ ایمیل یک درِ باز می‌گذاشت
-- برای ردیفی که هیچ راهی برای ورود ندارد — حسابی که نه می‌شود واردش شد و نه
-- می‌شود بازیابی‌اش کرد.


-- =============================================================================
-- بخش ۱ — ستون‌های هویت روی users
-- =============================================================================

ALTER TABLE `users`
  ADD COLUMN `phone` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER `email`,
  ADD COLUMN `phone_verified_at` DATETIME(6) NULL AFTER `email_verified_at`;

-- ⚠️ شماره **همیشه** به یک شکلِ متعارف ذخیره می‌شود: `989123456789` — بدون
-- صفر، بدون +، بدون فاصله و بدون خط تیره.
--
-- اگر هر کدام از شکل‌های `09123456789`، `+989123456789` و `9123456789` هرکدام
-- یک ردیف می‌ساختند، «این شماره قبلاً ثبت شده؟» دیگر پاسخِ قطعی نداشت و یک
-- نفر می‌توانست سه حساب با یک شماره بسازد. نرمال‌سازی در
-- `lib/auth/phone.ts` انجام می‌شود و این CHECK نگهبانِ دومش است — چون کدِ
-- برنامه فراموش می‌کند و دیتابیس نه.
ALTER TABLE `users`
  ADD CONSTRAINT `users_phone_format_check`
  CHECK (`phone` IS NULL OR `phone` REGEXP '^989[0-9]{9}$');

-- یکتا، ولی NULL ها آزادند: MySQL در ایندکس یکتا NULL ها را متمایز می‌شمارد،
-- پس هر تعداد کاربرِ بدونِ شماره مجازند و هر شماره فقط یک بار.
ALTER TABLE `users`
  ADD UNIQUE KEY `users_phone_key` (`phone`);

-- ⚠️ ایمیل دیگر اجباری نیست. (توضیحِ کاملش بالای همین فایل.)
ALTER TABLE `users`
  MODIFY COLUMN `email` VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- حسابی که نه ایمیل دارد و نه موبایل، حسابی است که هیچ‌کس نمی‌تواند واردش
-- شود و هیچ‌کس نمی‌تواند بازیابی‌اش کند. دیتابیس اجازهٔ ساختنش را نمی‌دهد.
ALTER TABLE `users`
  ADD CONSTRAINT `users_identity_check`
  CHECK (`email` IS NOT NULL OR `phone` IS NOT NULL);


-- =============================================================================
-- بخش ۲ — کدهای یک‌بارمصرفِ پیامکی
-- =============================================================================
--
-- ⚠️ چرا جدولِ جدا و نه افزودنِ یک ستونِ `phone` به `email_otps`:
--
-- آن جدول یک CHECK روی `purpose` دارد که فقط `signup_verify` و `email_change`
-- را می‌پذیرد، و ستونِ `email` اش NOT NULL است. تبدیلش به «یا ایمیل یا
-- موبایل» یعنی هر دو محدودیت شل شوند و هر کوئری‌ای که امروز روی آن جدول
-- نوشته شده، از فردا باید یادش باشد کدام نوع را می‌خواهد.
--
-- دو جدولِ جدا این را حذف می‌کند: هر کوئری دقیقاً می‌داند با چه چیزی طرف است.
CREATE TABLE `phone_otps` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- همان شکلِ متعارفِ بالا. اینجا هم CHECK دارد چون کدِ یک‌بارمصرف ممکن است
  -- برای شماره‌ای صادر شود که هنوز هیچ کاربری ندارد (ثبت‌نام).
  `phone` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,

  -- ⚠️ هشِ کد، نه خودِ کد. دسترسیِ خواندنی به دیتابیس نباید یعنی توانِ ورود
  -- به حساب‌ها. همان قاعده‌ای که `email_otps` هم دارد.
  `code_hash` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

  `purpose` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,

  `expires_at` DATETIME(6) NOT NULL,
  `attempts` SMALLINT NOT NULL DEFAULT 0,
  `consumed_at` DATETIME(6) NULL,
  `requested_ip` VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  KEY `phone_otps_ip_idx` (`requested_ip`, `created_at` DESC),
  KEY `phone_otps_lookup_idx` (`phone`, `purpose`, `created_at` DESC),

  CONSTRAINT `phone_otps_phone_format_check` CHECK (`phone` REGEXP '^989[0-9]{9}$'),

  -- سه کاری که با پیامک می‌شود کرد. `login` هم ثبت‌نام را پوشش می‌دهد و هم
  -- ورود: تا وقتی کد تأیید نشده، معلوم نیست شماره صاحبِ حساب هست یا نه، و
  -- تصمیم‌گیری دربارهٔ آن *بعد* از تأیید گرفته می‌شود.
  CONSTRAINT `phone_otps_purpose_check`
    CHECK (`purpose` IN ('login', 'phone_verify', 'password_reset'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
