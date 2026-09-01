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

اتصال، migration های اعمال‌شده، هر ۳۴ جدول، ویو، enum ها، تریگرها و مبدل‌های
نوع را بررسی می‌کند.

### پر کردن محتوای اولیه

دیتابیس تازه خالی است. دو آزمون نهاییِ آمادهٔ داخل repo را وارد کنید:

```bash
npm run db:seed-exams     # نیاز به DATABASE_URL در .env.local
```

بقیهٔ محتوا (سؤالات عروض سماعی، واژگان و محتوای بازی‌ها) از پنل مدیریت اضافه
می‌شود.

سه بازیِ جفت‌های ادبی، نینجای دستور زبان و جاسوسِ نقش‌ها تا وقتی جدول‌هایشان
خالی است با محتوای پیش‌فرضِ داخل کد کار می‌کنند، پس سایت از همان لحظهٔ اول
قابل بازی است. اولین ردیفی که در `/admin/games` ثبت شود جای کلِ آن محتوای
پیش‌فرض را می‌گیرد — یعنی مدیر با پنج نویسنده شروع نمی‌کند که ده تای دیگر هم
کنارشان باشد.

«مدار دستور» فرق دارد: محتوای پیش‌فرضِ داخلِ کد ندارد و از همان اول از دیتابیس
می‌خواند. بستهٔ ۵۵۵ پرسشیِ داخلِ repo را یک بار وارد کنید:

```bash
npm run db:seed-grammar-circuit
```

بعد از آن، پرسش‌های تازه از `/admin/games/grammar-circuit` ساخته می‌شوند.

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
lib/observability/  لاگر، شناسهٔ درخواست، پاک‌سازی داده‌های حساس
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
  صدایش بزنید تا در `/admin/activity` ظاهر شود. خطاهای گرفته‌نشدهٔ رندر و
  Server Action را `onRequestError` در `instrumentation.ts` می‌گیرد، پس
  چیزی بی‌صدا گم نمی‌شود.

- **هر Route Handler تازه با `withRoute` پوشیده می‌شود** (`lib/api/route.ts`):
  `export const POST = withRoute("/api/v1/…", async (request) => { … })`.
  همین یک پوشش، شناسهٔ درخواست، خطِ لاگِ پایانی و تورِ ایمنیِ ۵۰۰ را با هم
  می‌آورد. بدون آن، آن مسیر در لاگ نامرئی است.

- **تنظیمات تازه** به `SETTING_SPECS` در `lib/settings/index.ts` اضافه
  می‌شوند. کلیدی که `secret: true` داشته باشد هرگز مقدارش به مرورگر فرستاده
  نمی‌شود — پنل فقط می‌بیند که «مقداری ثبت شده».

- **محتوای بازی‌ها** همان الگوی واژه‌یاب را دارد: *ساختار* در کد و *محتوا* در
  دیتابیس. برای هر بازی سه تکه هست — دادهٔ ثابت و کمکی‌ها در `lib/<game>-data.ts`،
  خواندنِ سمت سرور با fallback در `lib/<game>-content.ts`، و CRUD پنل در
  `lib/admin/<game>-actions.ts`. صفحهٔ بازی داده را می‌خواند و به کامپوننت
  کلاینت prop می‌دهد، پس خودِ بازی نمی‌داند محتوا از دیتابیس آمده یا از کد.

- **پرسشِ «مدار دستور» را هیچ‌جا بدونِ اعتبارسنجی ننویسید.** ستون `payload` یک
  jsonb آزاد است و بودنِ یک ردیف در جدول اثباتِ سالم بودنش نیست؛ سه نویسنده
  دارد (اسکریپتِ seed، پنل، و هر چیزِ بعدی) و هر سه باید از همان
  `validateGrammarCircuitQuestion` رد شوند — شاملِ آزمونِ بن‌بست‌ناپذیری.
  پنل ساختِ payload را به `lib/grammar-circuit/authoring.ts` می‌سپارد و همان
  تابع را هم در مرورگر (برای بازخوردِ زنده) و هم دوباره روی سرور صدا می‌زند؛
  یک Server Action در عمل یک endpoint شبکه است و بررسیِ سمتِ مرورگر تضمینی
  نیست.

- **عملیات خطرناک** از `components/admin/ConfirmDialog.tsx` رد می‌شوند، نه از
  `confirm()` مرورگر. برای کاری که برگشت ندارد `requireTyping` بگذارید.

- **فهرست‌ها سمت سرور صفحه‌بندی می‌شوند.** الگویش در `adminListUsers` است:
  `count(*) over ()` برای تعداد کل، و `order by ... , id` تا یک ردیف در دو
  صفحه تکرار نشود.

- **`"use server"` فقط تابع async صادر می‌کند.** ثابت‌ها و برچسب‌ها در فایل
  جداگانه می‌روند (`lib/admin/log-constants.ts`، `lib/quiz/constants.ts`).
  این را فقط `next build` می‌گیرد، نه `tsc`.

---

## وقتی چیزی خراب شد: لاگ‌ها

این بخش برای همان روزی نوشته شده که کاربری می‌گوید «سایت خطا داد» و شما باید
بفهمید چه شد. لازم نیست چیزی از سرور بدانید.

### سه لاگ، سه کار متفاوت

| کجا | چه چیزی | چطور می‌بینید | چقدر می‌ماند |
|---|---|---|---|
| **لاگ عملیاتی** | هر درخواست، هر کوئری کند، هر ایمیل و آپلود | `docker compose logs -f app` | تا ۵۰ مگابایت، بعد می‌چرخد |
| **لاگ خطا** | خطاهایی که باید رسیدگی شوند | `/admin/activity` ← «خطاهای سرور» | تا وقتی خودتان پاک کنید |
| **لاگ ممیزی** | هر کاری که مدیران کرده‌اند | `/admin/activity` ← «فعالیت مدیران» | برای همیشه |

اولی موقتی است و برای فهمیدنِ «چه اتفاقی افتاد». دومی و سومی در دیتابیس‌اند و
از پنل دیده می‌شوند — یعنی برای دیدنشان لازم نیست به سرور SSH بزنید.

### شناسهٔ درخواست: چیزی که هر سه را به هم می‌دوزد

هر درخواست یک uuid می‌گیرد که `proxy.ts` می‌سازد. همان شناسه:

- در هدر `x-request-id` پاسخ برمی‌گردد (در تب Network مرورگر دیده می‌شود)،
- کنار هر خطا در `/admin/activity` نشان داده می‌شود، با دکمهٔ کپی،
- روی همهٔ خطوطِ لاگ عملیاتیِ همان درخواست می‌نشیند.

پس مسیر عیب‌یابی همیشه همین سه قدم است:

```bash
# ۱) شناسه را از /admin/activity کپی کنید (یا از کاربر بگیرید)
# ۲) روی سرور:
docker compose logs app | grep 8f0c1c2e-1111-4222-8333-444455556666
# ۳) حالا همهٔ خطوطِ آن درخواست را دارید — از ورودش تا کوئری دیتابیس و
#    ایمیلی که فرستاده شد.
```

هر خط یک JSON کامل است، پس اگر `jq` دارید می‌شود دقیق‌تر گشت:

```bash
# فقط خطاها
docker compose logs app | jq -R 'fromjson? | select(.level == "error")'

# فقط کوئری‌های کند
docker compose logs app | jq -R 'fromjson? | select(.event == "db.query.slow")'

# کندترین درخواست‌ها
docker compose logs app | jq -R 'fromjson? | select(.duration_ms > 1000) | {route, duration_ms}'
```

نمونهٔ یک خط:

```json
{"timestamp":"2026-03-04T09:12:44.108Z","level":"error","event":"http.request.failed",
 "message":"درخواست پردازش شد","service":"sarva","environment":"production",
 "release":"a1b2c3d","request_id":"8f0c1c2e-1111-4222-8333-444455556666",
 "route":"/api/v1/auth/login","method":"POST","status_code":500,"duration_ms":83,
 "outcome":"server_error",
 "err":{"name":"DatabaseError","message":"connection terminated","code":"ECONNRESET"}}
```

### چه چیزی هرگز در لاگ نمی‌آید

رمز، هش رمز، توکن (JWT، refresh، بازنشانی)، کد یک‌بارمصرف، کوکی، کلید API،
ایمیل، شمارهٔ موبایل، آدرس IP، متن سروده و دیدگاه، پاسخ آزمون، نام فایلی که
کاربر آپلود کرده، بدنهٔ درخواست یا پاسخ، و پارامترهای SQL.

این «قول» نیست، تست است: `tests/observability/` دقیقاً همین را می‌سنجد. اگر
روزی یکی از آن تست‌ها قرمز شد یعنی چیزی دارد نشت می‌کند — انتظارِ تست را عوض
نکنید، کد را.

منطقش در `lib/observability/redact.ts` است. اگر کلید تازه‌ای اضافه کردید که
راز است، مطمئن شوید نامش با یکی از الگوهای همان فایل می‌خواند.

### تنظیمات

همه در `.env` و همه اختیاری: `LOG_LEVEL`، `LOG_FORMAT`، `APP_RELEASE`،
`DB_SLOW_QUERY_MS`، `HTTP_LOG_SAMPLE`، `HTTP_SLOW_REQUEST_MS`. توضیح هرکدام
در `.env.example` است.

`APP_RELEASE` را حتماً پر کنید — بدون آن، بعد از هر انتشار معلوم نیست خطایی
که می‌بینید تازه است یا از قبل بوده:

```bash
echo "APP_RELEASE=$(git rev-parse --short HEAD)" >> .env
```

### نگهداشت

- **لاگ کانتینر** خودش می‌چرخد: `docker-compose.yml` برای هر سرویس سقفِ
  ۱۰ مگابایت × ۵ فایل گذاشته. بدون آن، لاگ تا پر شدنِ دیسک بزرگ می‌شود —
  و آن‌وقت پستگرس هم جایی برای نوشتن ندارد.

- **لاگ ممیزی مدیران** هرگز پاک نمی‌شود. نه خودکار، نه از پنل.

- **لاگ خطا** خودکار پاک نمی‌شود، چون داده‌ای که خودش می‌رود همیشه دقیقاً
  وقتی رفته که لازمش دارید. اگر روزی جدول بزرگ شد، خطاهای *رسیدگی‌شده* و
  قدیمی را دستی پاک کنید — **اول بشمارید**:

  ```bash
  # چند ردیف حذف خواهد شد؟ (فقط می‌شمارد، چیزی پاک نمی‌کند)
  docker compose exec db psql -U sarva -d sarva -c \
    "select count(*) from app_error_log
      where resolved_at is not null and last_seen_at < now() - interval '90 days';"

  # اگر عدد منطقی بود، حذف:
  docker compose exec db psql -U sarva -d sarva -c \
    "delete from app_error_log
      where resolved_at is not null and last_seen_at < now() - interval '90 days';"
  ```

  خطای رسیدگی‌نشده هرگز پاک نمی‌شود — همان چیزی است که هنوز کسی ندیده.

### وصل کردن به ابزارهای بیرونی (برای بعد)

لاگر عمداً بدون وابستگی نوشته شده (توضیح کاملش بالای `lib/observability/logger.ts`
است: `pino-pretty` از راه worker thread می‌آید و build standalone را شکننده
می‌کند). ولی نقطهٔ اتصالش آماده است:

```ts
import { addSink } from "@/lib/observability";

// در instrumentation.node.ts:
addSink((record) => {
  // record از قبل پاک‌سازی شده — هر مقصدی می‌تواند مستقیم مصرفش کند.
  // اینجا جای Loki، OpenTelemetry یا Sentry است.
});
```

یعنی افزودن یک مقصد تازه هیچ تغییری در کدِ فراخوان‌ها لازم ندارد.


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
| `npm test` | تست‌های واحد (`node --test`) |
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
