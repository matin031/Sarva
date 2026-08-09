# سروا

پلتفرم آموزش وزن شعر فارسی — امتحانات نهایی، عروض سماعی، واژه‌یاب، جاسوسِ
نقش‌ها، سروا کلاب، پنل کاربر و پنل مدیریت.

- مستندات API: [`API_DOCS.md`](./API_DOCS.md)
- اسکیمای دیتابیس: [`migrations/001_init.sql`](./migrations/001_init.sql)

---

## راه‌اندازی روی یک سرور تازه

سه چیز لازم است: Docker، Docker Compose، و یک فایل `.env`.

```bash
git clone <repo> sarva && cd sarva

cp .env.example .env
# .env را باز کنید و دست‌کم این‌ها را پر کنید:
#   POSTGRES_PASSWORD    رمز دیتابیس
#   AUTH_JWT_SECRET      openssl rand -base64 48
#   OTP_PEPPER           openssl rand -base64 48
#   ADMIN_EMAIL / ADMIN_PASSWORD   اولین حساب مدیر
#   MAIL_* یا RESEND_API_KEY       تا ایمیل تأیید ارسال شود

docker compose up -d --build
```

همین. کانتینر اپ قبل از بالا آمدن، خودش migration ها را اجرا و اولین مدیر را
می‌سازد.

سایت روی `http://localhost` بالا می‌آید. برای production فقط `SITE_ADDRESS` را
به دامنه‌تان تغییر بدهید (`SITE_ADDRESS=sarva.example.com`) و `ACME_EMAIL` را
پر کنید — Caddy خودش گواهی HTTPS می‌گیرد و تمدید می‌کند.

بعد از ساخته شدن مدیر، `ADMIN_PASSWORD` را از `.env` بردارید تا رمز روی دیسک
نماند.

### راستی‌آزمایی

```bash
docker compose exec app node scripts/db-check.mjs
```

اتصال، migration های اعمال‌شده، هر ۲۵ جدول، ویو، enum ها، تریگرها و مبدل‌های
نوع را بررسی می‌کند.

### پر کردن محتوای اولیه

دیتابیس تازه خالی است. دو آزمون نهاییِ آمادهٔ داخل repo را وارد کنید:

```bash
npm run db:seed-exams     # نیاز به DATABASE_URL در .env.local
```

بقیهٔ محتوا (سؤالات عروض سماعی، واژگان) از پنل مدیریت اضافه می‌شود.

---

## معماری

یک اپ Next.js، سه کانتینر:

```
┌─────────┐   :80/:443   ┌─────────┐   :3000   ┌──────────┐
│ Caddy   │ ───────────▶ │  Next   │ ────────▶ │ Postgres │
│ (proxy) │              │  (app)  │           │   (db)   │
└─────────┘              └─────────┘           └──────────┘
     │
     └─▶ /uploads/*  مستقیم از دیسک (با پشتیبانی Range)
```

Caddy فایل‌های آپلودی را خودش سرو می‌کند و نه Next — چون پخش‌کننده‌های صوت
(wavesurfer، `<audio>`) برای seek و رسم موج به Range request نیاز دارند.

### لایه‌بندی کد

```
lib/db/          اتصال به Postgres (Pool، query، transaction)
lib/auth/        JWT، هش رمز، سشن، requireUser/requireAdmin
lib/api/         پاسخ‌های استاندارد HTTP، محدودیت نرخ، کلاینت مرورگر
lib/storage/     آداپتر ذخیرهٔ فایل  (STORAGE_DRIVER)
lib/mail/        آداپتر ایمیل         (MAIL_DRIVER)
lib/sms/         آداپتر پیامک         (SMS_DRIVER)
lib/settings/    تنظیمات قابل‌ویرایش از پنل (دیتابیس → env)
```

سه پوشهٔ آداپتر عمداً پشت واسط‌اند تا تعویض سرویس، تغییر یک مقدار در `.env`
باشد نه گشتن در کد.

### امنیت

هیچ کلاینتی مستقیم به دیتابیس وصل نمی‌شود. تنها راه رسیدن به داده،
`requireUser()` یا `requireAdmin()` است. جزئیات در `API_DOCS.md`.

چند نکته که موقع تغییر کد باید بدانید:

- **آدرس IP** را همیشه از `requestMeta()` در `lib/api/http.ts` بگیرید، نه
  مستقیم از هدر `X-Forwarded-For`. آن تابع آخرین عضو زنجیره را می‌خواند؛ عضو
  اول را خودِ کلاینت می‌نویسد و جعلی است. خواندن مستقیمِ هدر یعنی همهٔ
  محدودیت‌های نرخ قابل دور زدن می‌شوند.

- **هدرهای امنیتی** (CSP و بقیه) در `next.config.ts` هستند و در زمان *build*
  ثابت می‌شوند — پس نباید به `process.env` وابسته باشند، چون مرحلهٔ build داکر
  هیچ `.env` ای ندارد. HSTS جدا در `Caddyfile` است، چون فقط روی TLS باید
  فرستاده شود.

- **متغیرهای `NEXT_PUBLIC_*`** وقتی در کامپوننت کلاینت خوانده شوند در باندل
  جاسازی می‌شوند و روی سرور همیشه خالی می‌مانند. اگر مقداری باید در زمان اجرا
  خوانده شود، از `/api/v1/config` رد کنید (نمونه‌اش کلید Turnstile).

- **آپلود فایل**: نوع فایل با بایت‌های خودش تشخیص داده می‌شود
  (`detectAudioFile`)، نه با `file.type` که کلاینت می‌فرستد، و پسوندِ روی دیسک
  از همان تشخیص می‌آید نه از نام کاربر.

- **کپچا** تا وقتی `TURNSTILE_SECRET_KEY` در محیط نباشد کاملاً خاموش است.
  راهنمای فعال کردنش بالای `lib/auth/turnstile.ts` و در `.env.example` است.

### پنل مدیریت

`/admin` تنها راه ادارهٔ سایت است و نباید لازم باشد کسی برای کار روزمره به
سرور یا دیتابیس دست بزند. چند نکته برای وقتی که کدش را عوض می‌کنید:

- **هر تغییرِ مدیریتی باید لاگ شود.** بعد از هر `requireAdmin()` که چیزی را
  می‌نویسد یا حذف می‌کند، یک `recordAudit()` بیاید — و اطلاعاتِ لازم برای
  خلاصه را *قبل* از حذف بخوانید، وگرنه فقط یک uuid برای نمایش می‌ماند.
  فهرست عمل‌ها در `lib/admin/audit.ts` بسته است؛ عمل تازه اول آنجا اضافه شود.

- **هیچ رازی وارد لاگ نمی‌شود.** `metadata` از `redactMetadata` رد می‌شود که
  هر کلیدی شبیه `secret|password|token|api_key` را پنهان می‌کند. اگر کلید
  تازه‌ای اضافه کردید که راز است، مطمئن شوید نامش با آن الگو می‌خواند.

- **خطاها هم باید دیده شوند.** `handleError` در `lib/api/http.ts` خودش
  `recordError` را صدا می‌زند؛ برای خطاهای داخل server action ها دستی
  صدایش بزنید تا در `/admin/activity` ظاهر شود.

- **تنظیمات تازه** به `SETTING_SPECS` در `lib/settings/index.ts` اضافه
  می‌شوند. کلیدی که `secret: true` داشته باشد هرگز مقدارش به مرورگر فرستاده
  نمی‌شود — پنل فقط می‌بیند که «مقداری ثبت شده».

- **عملیات خطرناک** از `components/admin/ConfirmDialog.tsx` رد می‌شوند، نه از
  `confirm()` مرورگر. برای کاری که برگشت ندارد `requireTyping` بگذارید.

- **فهرست‌ها سمت سرور صفحه‌بندی می‌شوند.** الگویش در `adminListUsers` است:
  `count(*) over ()` برای تعداد کل، و `order by ... , id` تا یک ردیف در دو
  صفحه تکرار نشود.

- **`"use server"` فقط تابع async صادر می‌کند.** ثابت‌ها و برچسب‌ها در فایل
  جداگانه می‌روند (`lib/admin/log-constants.ts`، `lib/quiz/constants.ts`).
  این را فقط `next build` می‌گیرد، نه `tsc`.

---

## توسعهٔ محلی

```bash
npm install

# یک Postgres لازم دارید. ساده‌ترین راه:
docker compose up -d db

# DATABASE_URL را در .env.local بگذارید:
#   DATABASE_URL=postgres://sarva:<رمز>@127.0.0.1:5433/sarva
npm run db:migrate
npm run db:seed-admin
npm run dev
```

| دستور | کار |
|---|---|
| `npm run dev` | سرور توسعه |
| `npm run build` | build تولیدی |
| `npm run lint` | ESLint |
| `npm run db:migrate` | اجرای migration های اعمال‌نشده |
| `npm run db:check` | بررسی سلامت اتصال و اسکیما |
| `npm run db:seed-admin` | ساخت/ارتقای حساب مدیر |
| `npm run db:seed-exams` | وارد کردن آزمون‌های ایستا |

### افزودن migration

یک فایل تازه در `migrations/` با شمارهٔ بعدی بسازید (`002_...sql`). اجراکننده
فایل‌ها را به ترتیب نام اجرا می‌کند، هرکدام را در تراکنش خودش، و در جدول
`schema_migrations` ثبت می‌کند. فایل‌های اعمال‌شده هرگز دوباره اجرا نمی‌شوند —
پس یک migration منتشرشده را ویرایش نکنید، فایل تازه بسازید.

---

## انتقال به سرور دیگر

```bash
# روی سرور قدیم
docker compose exec db pg_dump -U sarva sarva > backup.sql
docker compose cp app:/app/uploads ./uploads-backup

# روی سرور جدید
docker compose up -d db
docker compose exec -T db psql -U sarva sarva < backup.sql
docker compose cp ./uploads-backup app:/app/uploads
docker compose up -d
```

هیچ مقداری در کد هاردکد نیست؛ همه‌چیز از `.env` می‌آید.
