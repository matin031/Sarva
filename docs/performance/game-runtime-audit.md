**گزارش runtime animation صفحهٔ `/game` — ۲۰۲۶/۰۹/۲۱**

محدوده فقط صفحهٔ کهکشان بازی‌ها و اجزای آن است. صفحات خودِ بازی‌ها و سایر صفحات Sarva ارزیابی یا بهینه‌سازی نشدند. تغییرات قبلیِ موجود در working tree، از جمله متن بازی‌ها، حفظ شدند.

**روش اندازه‌گیری و حدود نتیجه**

Chrome 153.0.8010.52 نصب‌شده روی میزبان، در حالت headless با GPU واقعی Intel UHD / ANGLE Direct3D11 اجرا شد؛ renderer از WebGL خوانده شد و SwiftShader نبود. مرورگر ۸ هستهٔ منطقی و ۸GB deviceMemory گزارش کرد. این مشخصاتِ محیط آزمایش است؛ وضعیت Chrome شخصی کاربر با i5-12400 تأیید نشده است.

دو اندازهٔ viewport، دسکتاپ 1440×900 و موبایل 390×844، بررسی شدند. دسکتاپ معمولی و هر دو اندازه با CPU throttling برابر 4× اندازه‌گیری شدند. برای هر حالت، سه بار idle، اسکرول آهسته و اسکرول سریع، به‌علاوهٔ ورود صفحه، pointer/hover و سه بار باز و بسته شدن فهرست ثبت شد. اندازه‌گیری هر نسخه در یک مرورگر مشترک انجام شد. تست بازگشت به route، resize و بازیابی context جداگانه اجرا شد تا وارد اعداد performance نشود.

فریم‌ها از فراخوانی واقعی WebGL `clear` در این صفحهٔ تک‌Canvas شمرده شدند، نه یک حلقهٔ خالی rAF. این عدد **نرخ ارسال فریم صحنه** است؛ تضمین تعداد فریم‌های ارائه‌شده روی نمایشگر واقعی نیست. `Performance.getMetrics`، long-task observer، hook ثبت commit ری‌اکت و trace قابل‌بارگذاری در Chrome DevTools هم ثبت شدند. layer count از LayerTree در این محیط داده نداد و ناموجود گزارش می‌شود؛ partially-presented frames نیز به‌طور قابل‌اتکا استخراج نشد.

Synthetic touch در Chrome headless این میزبان صفحه را اسکرول نکرد. آن نمونه کنار گذاشته شد؛ اندازهٔ موبایل با ورودی wheel و تأیید تغییر scrollY دوباره آزمایش شد. این تست جای آزمایش لمس و GPU یک گوشی واقعی را نمی‌گیرد.

بیلد کامل، پیش از تغییرات این کار نیز در بخش دروس خطای کامپایل داشت. بنابراین profiling از خروجی بهینه‌شدهٔ production با `--debug-build-paths=app/game/page.tsx --experimental-build-mode=compile` انجام شد؛ این خروجی برای اجرای آزمایش بود و به معنی موفق بودن build کامل پروژه نیست. backend و تنظیمات deployment برای عبور از این مانع تغییر نکردند.

**اعداد نهایی قبل / بعد**

مقادیر FPS و فاصلهٔ فریم، میانهٔ سه اجرای هر سناریو هستند. ستون فاصله، میانهٔ p95 هر اجرا بر حسب ms است. idle در scrollY=650 و با عنوان خارج دید اندازه‌گیری شده است.

| محیط | سناریو | نرخ رندر قبل → بعد | فاصلهٔ p95 قبل → بعد |
| --- | --- | --- | --- |
| دسکتاپ | idle | 20.3 → 60.1 | 50.6 → 17.2 |
| دسکتاپ | اسکرول آهسته | 55.6 → 60.0 | 18.2 → 17.7 |
| دسکتاپ | اسکرول سریع | 49.8 → 60.1 | 49.9 → 18.0 |
| دسکتاپ CPU×4 | idle | 19.8 → 60.1 | 53.0 → 20.5 |
| دسکتاپ CPU×4 | اسکرول آهسته | 42.5 → 59.7 | 36.7 → 20.2 |
| دسکتاپ CPU×4 | اسکرول سریع | 40.7 → 57.1 | 50.2 → 22.2 |
| viewport موبایل CPU×4 | idle | 16.5 → 60.0 | 68.5 → 18.7 |
| viewport موبایل CPU×4 | اسکرول آهسته | 38.1 → 58.5 | 37.6 → 19.8 |
| viewport موبایل CPU×4 | اسکرول سریع | 35.6 → 58.9 | 57.2 → 20.0 |

**محدودیت باقی‌مانده:** در اولین عبور سریع که revealهای بخش‌های تازه هم‌زمان فعال می‌شوند، desktop×4 از 19.1 به 28.4 و mobile×4 از 21.2 به 32.5 رسید. این بخش هنوز ۶۰ فریم پایدار نیست؛ میانهٔ جدول نباید این واقعیت را پنهان کند. علت سهم‌های دقیق آن به‌صورت جداگانه تفکیک نشد؛ نمی‌توان صرفاً آن را به shader یا Motion نسبت داد. صفحات بعدی خارج از محدوده ماندند.

اعداد thread زیر میانهٔ مجموع زمان هر سناریو بر حسب ms هستند؛ ستون‌ها تو در تو هستند و نباید با یکدیگر جمع شوند.

| محیط / سناریو | main-thread قبل → بعد | scripting قبل → بعد | style قبل → بعد | Paint قبل → بعد |
| --- | --- | --- | --- | --- |
| دسکتاپ idle، حدود ۲٫۴s | 391.7 → 282.6 | 46.9 → 80.6 | 77.5 → 31.8 | 69.5 → 0 |
| دسکتاپ اسکرول آهسته | 1016.7 → 584.3 | 145.8 → 128.8 | 105.2 → 55.8 | 305.3 → 0 |
| دسکتاپ اسکرول سریع | 491.0 → 284.3 | 67.5 → 64.7 | 63.6 → 26.6 | 122.3 → 7.1 |
| دسکتاپ×4 idle | 1524.2 → 1598.5 | 301.4 → 799.3 | 289.7 → 101.2 | 183.3 → 0 |
| موبایل×4 اسکرول سریع | 1245.8 → 998.5 | 171.2 → 272.8 | 136.5 → 92.2 | 218.3 → 17.4 |

اجرای فریم‌های بیشتر طبیعی است که زمان scripting کل را در بعضی حالت‌ها بالا ببرد؛ در idle دسکتاپ×4 مجموع main-thread حدود ۵٪ بیشتر شد، در عوض صحنه سه برابر فریم تولید کرد. بنابراین ادعا نمی‌شود CPU کل در همهٔ سناریوها کمتر است. هزینه به ازای فریم و Paint اضافی کمتر شده و cadence بهبود یافته است. در desktop idle تعداد Paint از میانهٔ ۲۸۸ به صفر رسید؛ این یعنی نبود Paint ثبت‌شدهٔ DOM در آن بازه، نه اینکه WebGL یا GPU کاری نداشته باشد.

مجموع سه اسکرول سریع:

| محیط | فاصلهٔ WebGL بالای ۵۰ms قبل → بعد | markerهای DroppedFrame در trace قبل → بعد | long task بالای ۵۰ms قبل → بعد |
| --- | --- | --- | --- |
| دسکتاپ | 8 → 1 | 14 → 7 | 0 → 0 |
| دسکتاپ×4 | 24 → 10 | 102 → 63 | 2 → 0 |
| موبایل×4 | 26 → 6 | 109 → 49 | 3 → 0 |

DroppedFrameها markerهای خامِ trace همین workload هستند، نه FPS واقعی کاربران. Commit ری‌اکت در تمام ۹ سناریوی idle/scroll، پیش و پس از تغییر، صفر بود. فهرست در هر دو نسخه ۳۳ commit داشت؛ interaction واقعی است، نه render در هر فریم. شمارش میانهٔ Recalculate Style در desktop idle برابر ۱۴۵ باقی ماند، اما زمان آن کم شد. در idle تعداد Layout صفر بود؛ Layoutهای entrance و menu همچنان وجود دارند. تمام جزئیات ۹ سناریو، از جمله زمان و شمارش Layout/Style، در [دادهٔ مقایسه](./game-runtime-results.json) ثبت شده است.

**فهرست implementationهای صفحه**

| بخش | انیمیشن و مسیر اجرا | نتیجهٔ بررسی |
| --- | --- | --- |
| GamesGalaxy و revealهای مشترک عروض | ورود و stagger با Motion؛ transform و opacity | در idle، scroll و pointer هیچ commit اضافهٔ ری‌اکت ثبت نشد؛ بازنویسی نشدند. |
| عنوان گرادیانی | CSS background-position، چرخهٔ ۶ ثانیه | حتی بیرون viewport باعث Paint مداوم بود؛ فقط هنگام نامرئی بودن pause می‌شود. |
| GalaxyScene | یک Canvas ثابت R3F؛ ۹ سیاره، ستاره‌ها، ماه، حلقه و جو | گلوگاه زمان‌بند؛ هندسه، متریال، shader و DPR پروفایل‌های موجود نگه داشته شد. |
| scheduler و FrameDriver | timeout → rAF → invalidate → rAF | هدف اسمی ۳۰/۲۴ به حدود ۲۰/۱۶ فریم تبدیل می‌شد؛ رندر مستقیم در همان rAF جایگزین شد. |
| Planet / Planets | چرخش، drift، نفس‌کشیدن جو، دنبال‌کردن pointer و ورود scale | کار اجسام خارج دید کوتاه می‌شود؛ phase چرخش از زمان محاسبه می‌شود. اندازه‌گیری‌ها بیرون حلقه باقی ماندند. |
| SpaceCable | رسم stroke-dashoffset با WAAPI، دنباله‌دار transform، nodeهای CSS | مسیر و زمان‌ها حفظ شد؛ CSS خارج دید و حرکت تب مخفی pause می‌شوند؛ تغییر reduced-motion دیگر stroke مخفی باقی نمی‌گذارد. |
| هاله‌ها، wash پس‌زمینه و سایهٔ کارت‌ها | گرادیان ثابت، shadow و ورود Motion | حذف یا کاهش نیافتند. |
| Header و فهرست مشترک | transition/CSS و Radix | باز و بسته شدن در سناریو ثبت شد؛ کد مشترک تغییر نکرد. |

در این صفحه `layout`/`layoutId`، height:auto animation، scroll-driven React state یا asset تصویری بزرگِ متحرک دیده نشد. سیاره‌ها هندسهٔ procedural مشترک و ستاره‌ها یک Points buffer هستند. سیاست client boundary و dynamic import دست‌نخورده ماند.

**تشخیص و اصلاح**

۱. زمان‌بندیِ قبلی عمداً cadence را محدود می‌کرد و ترکیب timeout و دو rAF موعد نمایش را از دست می‌داد. اکنون یک clock با cadence نمایشگر کار می‌کند و `advance` در R3F با `frameloop="never"` در همان tick اجرا می‌شود. قرارداد `advance` و ثانیه بودن timestamp با کد نسخهٔ نصب‌شده کنترل شد؛ `invalidate` صرفاً درخواست فریم آینده است و رندر فوری انجام نمی‌دهد. [مستندات R3F](https://r3f.docs.pmnd.rs/advanced/scaling-performance)

۲. در نمونهٔ idle قبل، عنوان خارج دید در ۲٫۴ ثانیه ۱۴۴ Paint روی document و ۱۴۴ Paint روی span گرادیانی ایجاد کرد. observer محلی اکنون عنوان و nodeهای خارج دید را pause می‌کند و با ورود دوباره همان phase را ادامه می‌دهد. هیچ will-change جدید، containment یا تغییر shader برای این کار اضافه نشد.

۳. پنهان بودن یک گروه در Three فقط drawing را کنار می‌گذارد؛ callbackهای useFrame آن همچنان اجرا می‌شدند. محاسبات بی‌استفادهٔ سیاره‌های خارج دید اکنون زود برمی‌گردند. چرخش بر اساس زمان فعال محاسبه می‌شود؛ زمان تب مخفی وارد clock نمی‌شود، ولی یک فریم کندِ قابل‌دیدن، مدت حرکت shader و wobble را طولانی نمی‌کند.

۴. حرکت ستاره‌ها قبلاً «مقدار ثابت در هر فریم» بود و هنگام scroll با نرخ رندر سرعت می‌گرفت. اکنون با delta و cadence اسمی قبلیِ صحنه، ۳۰/۲۴، به حرکت بر حسب ثانیه تبدیل شده است. تعداد ستاره‌ها و اندازه‌شان کم نشده است. این اصلاحِ وابستگی سرعت به FPS است، نه کاهش duration یا حذف حرکت.

۵. کش موقعیت سیاره‌ها فقط تغییر عرض را می‌دید؛ sectionهای وابسته به vh در resize صرفاً ارتفاع از جایشان می‌رفتند. اکنون تغییر ابعاد viewport/document نیز اندازه‌گیری دسته‌ای درخواست می‌کند. در تست resize ارتفاع، خطای هم‌ترازی سیاره و placeholder کمتر از یک پیکسل بود.

۶. `coarse && weak` به پروفایل کاملاً بی‌حرکت می‌رفت. اکنون این ترکیب فقط balanced را انتخاب می‌کند و حرکت را خاموش نمی‌کند. reduced-motion از قابلیت دستگاه جدا شد. متریال ساده‌ترِ balanced از قبل وجود داشت و در این کار shader جدیدی حذف نشد.

۷. وقتی سیستم reduced-motion درخواست کند، پیش‌فرض همچنان رعایت می‌شود و فقط در همان حالت، دکمهٔ «پخش انیمیشن‌های این صفحه» ظاهر می‌شود. انتخاب اختیاری محدود به همین mount صفحه است؛ تنظیمات سیستم یا مرورگر دستکاری نمی‌شود. گزینهٔ بازگشت به تنظیم دستگاه نیز وجود دارد.

برای ثابت ماندن انیمیشن‌ها روی یک CPU قوی، reduced-motion یک مسیر بازتولیدشده است، اما بدون خواندن وضعیت Chrome شخصی کاربر نمی‌توان آن را علت قطعی اعلام کرد. خاموش بودن Animation Effects در تنظیمات دسترس‌پذیری Windows می‌تواند به مرورگر چنین ترجیحی بدهد. [راهنمای تنظیمات و media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

**حفظ ظاهر و رفتار**

در شش snapshot، سه موقعیت scroll روی دسکتاپ و موبایل، تفاوت اندازه و موقعیت DOM متن‌ها، کارت‌ها و sectionها صفر بود. متن، اندازهٔ فونت، filter، backdrop-filter و shadowهای خوانده‌شده تفاوت نداشتند. ابعاد Canvas، تعداد هندسه‌ها و programهای shader در موقعیت‌های متناظر یکسان بود؛ nodeهای کابل همچنان ۱۰ موردند. screenshots نیز بازبینی شدند. فاز لحظه‌ایِ انیمیشن‌های زنده قابل pixel-equality نیست و چنین ادعایی نمی‌شود.

Timing و easing ورودهای Motion، دورهٔ ۶ ثانیه‌ای گرادیان، ۲٫۶ ثانیه‌ای nodeها، ۹ ثانیه‌ای دنباله‌دار و هندسهٔ مسیر کابل حفظ شدند. blur/glass/shadow و هیچ انیمیشن قابل‌دیدنی حذف نشد. فقط کار نامرئی pause می‌شود؛ اصلاح سرعت وابسته به FPS ستاره‌ها در بالا صریحاً ذکر شده است.

تست مرورگر برای هر دو اندازه: تغییر ارتفاع، خاموشی واقعی clock در reduced-motion، پخش اختیاری، بازگشت به reduced-motion و دیده‌شدن کامل کابل، از دست رفتن و بازیابی WebGL context، خروج از route و برگشت با فقط یک Canvas موفق بود. توقف تب مخفی، توقف host خارج دید، cleanup و شروع دوباره، coalescing رویداد scroll و حفظ زمان فریم کند نیز تست واحد دارند.

**مواردی که عمداً تغییر نکردند**

شواهدی برای React.memo سراسری، تعویض Motion/Three، کاهش رزولوشن یا geometry، حذف blur، افزودن will-change، بازنویسی SSR، dynamic import بیشتر یا content-visibility وجود نداشت. عنوان هنگام دیده شدن هنوز همان background-position را paint می‌کند. containment روی متن فارسی به دلیل خطر بریدن امتداد حروف اضافه نشد. Paint کابل هنگام entrance و هزینهٔ هم‌زمانی revealها باقی است؛ هدفِ این اصلاح کم‌کردن کار اضافه بود.

Layout thrashing گلوگاه اصلی این capture نبود: idle صفر Layout داشت و اندازه‌گیری مستمر DOM در حلقهٔ صحنه وجود نداشت. Layoutهای ورود، resize و فهرست از گزارش پنهان نشده‌اند. blur/backdrop-filter نیز بر اساس trace گلوگاه اصلی تشخیص داده نشد؛ تغییرشان توجیهی نداشت.

**اعتبارسنجی**

| فرمان / بررسی | نتیجه |
| --- | --- |
| `npm test` | ۱۰۲۱ تست موفق، صفر شکست؛ شامل ۹ تست کیفیت و scheduler |
| `next typegen` سپس `tsc --noEmit` | ۴ خطای خارج از این کار در BeytCard و PassageCard: hasAiLesson و syntax |
| `npm run lint` | ۸۷ خطا و ۸۹ هشدار خارج از تغییرات این کار؛ بخشی از scan مربوط به .claude/skills است |
| lint محدود به فایل‌های این کار | صفر خطا؛ یک هشدار قبلی دربارهٔ dependency نسخهٔ registry در useMemo |
| `npm run build` | شکست در import سمت client از server-only در بخش دروس؛ همین مانع پیش از کار نیز وجود داشت |
| compile تولیدی محدود به game | موفق؛ برای profiling استفاده شد و جای build کامل را نمی‌گیرد |
| visual و lifecycle | موفق در دسکتاپ و viewport موبایل |
| `git diff --check` روی فایل‌های این کار | موفق |

فایل‌های اجرایی تغییرکرده: `components/UI/galaxy/{scheduler.ts,quality.ts,GalaxyScene.tsx,SpaceCable.tsx}` و `components/UI/games/{GamesGalaxy.tsx,games-galaxy.module.css}`. ابزارهای audit در `scripts/perf/game-runtime.mjs` و `scripts/perf/game-visual-check.mjs` و تست‌ها در `tests/galaxy/` قرار دارند. وابستگی جدیدی نصب نشد. backend، دیتابیس، auth، قرارداد API و deployment تغییر نکردند.

برای بازتولید، `PLAYWRIGHT_PATH` را در صورت نیاز به نصب موجود Playwright اشاره دهید و این دو script را با آرگومان‌های base URL، پوشهٔ خروجی و label اجرا کنید. label با پیشوند `after` تست‌های رفتاری جدید را نیز فعال می‌کند. traceهای JSON مستقیماً در Performance پنل Chrome باز می‌شوند.

فایل‌های خامِ این اجرا در پوشهٔ artifact همین task نگهداری شده‌اند:

- [خلاصهٔ معتبر قبل](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/before-valid-summary.json) و [خلاصهٔ نسخهٔ نهایی](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/after-final-summary.json).
- Trace دسکتاپ: [قبل](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/before-desktop-trace.json)، [بعد](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/after-final-desktop-trace.json).
- Trace دسکتاپ×4: [قبل](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/before-desktop-4x-trace.json)، [بعد](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/after-final-desktop-4x-trace.json).
- Trace viewport موبایل×4 با scroll تأییدشده: [قبل](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/before-mobile-mobile-4x-trace.json)، [بعد](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/after-final-mobile-4x-trace.json).
- [نتیجهٔ مقایسهٔ ظاهر](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/visual-comparison.json)، [تست‌ها](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/game-tests-final.log)، [typecheck](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/game-typecheck-final.log)، [build کامل](C:/Users/Admin/.codex/visualizations/2026/09/21/01a0c390-be3a-7962-976c-de24c5d580f9/game-build-final.log).
