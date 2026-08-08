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
