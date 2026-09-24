# سئو و «جئو»ی سروا

این سند برای برنامه‌نویس است. مالکِ سایت همه‌چیزِ لازم را در پنلِ مدیریت، صفحهٔ
**«سئو و هوش مصنوعی»** (`/admin/seo`) می‌بیند — با چک‌لیست، آزمون‌ها و قدم‌به‌قدمِ هر کار.

## نقشهٔ فایل‌ها

| فایل | کار |
|---|---|
| `lib/seo/catalog.ts` | **تنها منبعِ** عنوان، توضیح و اولویتِ هر صفحهٔ عمومی. sitemap، `llms.txt` و پیش‌نمایشِ گوگلِ پنل همین را می‌خوانند. |
| `lib/seo/metadata.ts` | `pageMetadata()` و `catalogMetadata()` — canonical، `openGraph` و `twitter` را *همیشه با هم* می‌سازند. |
| `lib/seo/lesson.ts` | عنوان، توضیح و `LearningResource`/`Course` برای درس‌ها. |
| `lib/seo/entity.ts` | هویتِ سروا: `WebSite`، `EducationalOrganization`، بازی، ابزار، سرودهٔ کلاب. |
| `lib/seo/policy.ts` | قواعدِ `robots.txt` و فهرستِ ربات‌های هوش مصنوعی. |
| `lib/seo/settings.ts` | خواندنِ تنظیماتِ سئو از `app_settings` — با سقفِ زمانی و پیش‌فرضِ امن. |
| `lib/seo/llms.ts` | `/llms.txt` و `/llms-full.txt`. |
| `lib/seo/urls.ts` | همهٔ نشانی‌های ایندکس‌پذیر (sitemap، IndexNow، آزمونِ سلامت). |
| `lib/seo/health.ts` | آزمون‌های سلامتِ پنل. |
| `lib/seo/indexnow.ts` | ارسال به Bing/Yandex. |
| `lib/seo/playbook.ts` | چک‌لیستِ مالک، پرسش‌های آزمونِ هوش مصنوعی، پرامپت‌های آماده. |

## قاعده‌ها

1. **صفحهٔ عمومیِ تازه** → یک ردیف در `SEO_PAGES` و در خودِ صفحه
   `export const metadata = catalogMetadata("/path")`. همین کافی است: sitemap و
   `llms.txt` خودشان اضافه‌اش می‌کنند. آزمونِ `tests/seo/catalog.test.ts` بررسی
   می‌کند فایلِ صفحه واقعاً وجود دارد.
2. **هرگز `metadata`ی بدونِ `openGraph` ننویسید.** Next متادیتا را *سطحی*
   ادغام می‌کند؛ صفحه‌ای که `openGraph` ندارد، `og:url` و عنوانِ صفحهٔ خانه را
   به ارث می‌برد. تا پیش از این تغییر، همهٔ بازی‌ها، درس‌ها و سروده‌های کلاب
   در تلگرام خودشان را «صفحهٔ خانه» معرفی می‌کردند. `pageMetadata` این را
   اجباری کرده؛ `npm run seo:check` هم `og:url ≠ canonical` را می‌گیرد.
3. **تصویرِ اشتراک‌گذاری صریح است** (`DEFAULT_OG_IMAGE`)، چون قراردادِ فایلیِ
   `app/opengraph-image.png` به صفحه‌ای که `openGraph`ِ خودش را دارد نمی‌رسد.
4. **هیچ دادهٔ ساختاریافتهٔ بی‌پشتوانه‌ای نه** — نه امتیاز، نه نظر، نه قیمت، نه
   `FAQPage` بدونِ پرسش‌وپاسخِ واقعیِ روی صفحه. `seo:check` همین را می‌سنجد.
5. **لایوتِ ریشه به دیتابیس دست نمی‌زند.** فقط صفحهٔ خانه (ISR، ساعتی) و
   `robots.txt`/`llms.txt` تنظیماتِ سئو را می‌خوانند؛ ذخیرهٔ هر تنظیمِ `seo.*`
   در پنل همه را فوراً `revalidatePath` می‌کند.

## بررسی

```bash
npm run build && npm start -- -p 4700
npm run seo:check                 # عنوان، canonical، og، JSON-LD، robots، sitemap، llms.txt
node --import tsx --test tests/seo/*.test.ts
```

## ربات‌ها

`next.config.ts` ← `htmlLimitedBots` ربات‌های هوش مصنوعی و `TelegramBot` را به
فهرستِ پیش‌فرضِ Next اضافه می‌کند تا متادیتای صفحه‌های پویا همیشه داخلِ `<head>`
به آن‌ها برسد. اگر Next را ارتقا دادید، فهرستِ پیش‌فرضش را با
`node_modules/next/dist/shared/lib/router/utils/html-bots.js` مقایسه کنید.
