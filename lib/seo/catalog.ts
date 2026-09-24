/**
 * فهرستِ صفحه‌های عمومیِ سروا — تنها منبعِ عنوان، توضیح و جایگاهِ هر صفحه
 * در نتیجهٔ جست‌وجو.
 *
 * ── چرا یک فهرست و نه متادیتای پراکنده در هر فایل ─────────────────────────
 *
 * تا پیش از این، عنوان و توضیحِ هر صفحه در فایلِ خودش بود، فهرستِ آدرس‌های
 * sitemap دستی در `app/sitemap.ts` تکرار شده بود و فهرستِ بازی‌ها سومین بار
 * در همان فایل. نتیجه‌اش سه چیزِ واقعی بود:
 *
 *   • `/learn/motammam` و `/learn/tashbih` صفحه‌های عمومی و ایندکس‌پذیر
 *     بودند ولی هیچ‌وقت به sitemap نرسیدند — کسی یادش نبود آنجا هم بنویسد.
 *   • `/exam` توضیح نداشت و توضیحِ ریشه («آموزش وزن و عروض…») را می‌گرفت.
 *   • هیچ‌کدام از بازی‌ها `openGraph` نداشتند و چون متادیتا در Next *سطحی*
 *     ادغام می‌شود، `og:url` و `og:title`ِ صفحهٔ خانه را به ارث می‌بردند.
 *     لینکِ «کیمیای وزن» در تلگرام با عنوانِ صفحهٔ خانه باز می‌شد.
 *
 * حالا هر صفحه متادیتایش را از اینجا می‌گیرد (`pageMetadata(SEO_PAGES[…])`)،
 * و sitemap، `llms.txt` و بخشِ سئوی پنل مدیریت همین فهرست را می‌خوانند.
 * صفحه‌ای که اینجا اضافه شود، همه‌جا اعلام می‌شود.
 *
 * ── دربارهٔ متن‌ها ─────────────────────────────────────────────────────────
 *
 * عنوان‌ها با واژه‌هایی شروع می‌شوند که دانش‌آموز واقعاً جست‌وجو می‌کند
 * («معنی درس…»، «آموزش عروض»، «وزن‌یاب آنلاین») و نه با نامِ برند؛ نامِ
 * برند را قالبِ ریشه خودش به انتها اضافه می‌کند (` | سروا`).
 *
 * ⚠️ و هیچ ادعایی نیست که صفحه پشتش نباشد: «سؤال امتحانی» فقط برای درسی
 * نوشته می‌شود که واقعاً سؤال دارد (`lib/seo/lesson.ts`)، و قیمت، امتیاز و
 * نظرِ کاربر هیچ‌جا ساخته نمی‌شود.
 *
 * ⚠️ این فایل هیچ import ای ندارد تا هم در سرور، هم در آزمون و هم در
 * کامپوننتِ کلاینتِ پنل قابلِ خواندن باشد.
 */

export type SeoSection = "core" | "learn" | "tool" | "game" | "community" | "info";

export type SeoPage = {
  /** مسیر با اسلشِ آغازین. */
  path: string;
  /** نامِ کوتاه — برای breadcrumb، `llms.txt` و فهرستِ پنل. */
  name: string;
  /** عنوانِ صفحه، *بدونِ* نامِ برند (قالبِ ریشه « | سروا» را اضافه می‌کند). */
  title: string;
  /** ۱۲۰ تا ۱۶۰ نویسه؛ همان متنی که زیرِ عنوان در نتیجهٔ جست‌وجو می‌آید. */
  description: string;
  section: SeoSection;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  /** نوعِ دادهٔ ساختاریافته‌ای که صفحه می‌گیرد، اگر چیزی جز breadcrumb باشد. */
  schema?: "game" | "tool" | "course";
  /** اگر صفحه فقط گاهی وجود دارد (مثلاً `/plus` وقتی پلاس خاموش است). */
  conditional?: "plus";
};

function page(p: SeoPage): SeoPage {
  return p;
}

export const SEO_PAGES = {
  "/": page({
    path: "/",
    name: "خانه",
    title: "سروا | معنی درس‌های فارسی دهم، یازدهم و دوازدهم، عروض و بازی ادبی",
    description:
      "سروا: معنی و شرح بیت‌به‌بیت درس‌های فارسی دهم، یازدهم و دوازدهم، آموزش عروض و وزن شعر، وزن‌یاب آنلاین، نمونه‌سؤال امتحان نهایی و بازی‌های آموزشی ادبیات.",
    section: "core",
    priority: 1,
    changeFrequency: "weekly",
  }),
  "/doroos": page({
    path: "/doroos",
    name: "درسنامه",
    title: "درسنامهٔ فارسی دهم، یازدهم و دوازدهم — معنی بیت‌به‌بیت و آرایه‌ها",
    description:
      "معنی روان، قلمرو زبانی، ادبی و فکری و آرایه‌های درس‌های فارسی ۱، فارسی ۲ و فارسی ۳؛ شرحِ بیت‌به‌بیت برای دانش‌آموزان دهم، یازدهم و دوازدهم.",
    section: "core",
    priority: 0.9,
    changeFrequency: "weekly",
    schema: "course",
  }),
  "/aruz": page({
    path: "/aruz",
    name: "عروض سماعی",
    title: "آموزش عروض سماعی — یادگیری وزن شعر فارسی با گوش",
    description:
      "عروض و وزن شعر فارسی را با گوش یاد بگیر: آموزش گام‌به‌گامِ اوزان عروضی، تمرین شنیداری با نمونه‌های صوتی، تقطیع هجایی و بازی برای تشخیص وزن.",
    section: "learn",
    priority: 0.9,
    changeFrequency: "monthly",
  }),
  "/vazn-yab": page({
    path: "/vazn-yab",
    name: "وزن‌یاب",
    title: "وزن‌یاب آنلاین — تشخیص وزن و تقطیع شعر فارسی",
    description:
      "یک مصراع بنویس تا وزن عروضی، ارکان و تقطیع هجایی‌اش را ببینی. وزن‌یاب سروا اول بیت‌های شناخته‌شده را بررسی می‌کند و بعد با موتور عروض وزن را تشخیص می‌دهد.",
    section: "tool",
    priority: 0.9,
    changeFrequency: "monthly",
    schema: "tool",
  }),
  "/timeline": page({
    path: "/timeline",
    name: "خط زمان ادبیات",
    title: "خط زمان ادبیات فارسی — سبک‌ها، شاعران و آثار",
    description:
      "سبک‌ها، شاعران و آثار ادبیات فارسی از فارسی باستان تا امروز روی یک خط زمان؛ بر اساس کتاب علوم و فنون ادبی دهم، یازدهم و دوازدهم.",
    section: "learn",
    priority: 0.8,
    changeFrequency: "monthly",
  }),
  "/learn/tashbih": page({
    path: "/learn/tashbih",
    name: "درسنامهٔ تعاملی تشبیه",
    title: "تشبیه چیست؟ آموزش تعاملی ارکان و انواع تشبیه",
    description:
      "ارکان تشبیه (مشبه، مشبه‌به، ادات و وجه شبه)، اضافهٔ تشبیهی، تشبیه بلیغ و تمثیل را قدم‌به‌قدم و با مثال‌های کتاب‌های فارسی دبیرستان یاد بگیر.",
    section: "learn",
    priority: 0.7,
    changeFrequency: "monthly",
  }),
  "/learn/motammam": page({
    path: "/learn/motammam",
    name: "درسنامهٔ تعاملی متمم",
    title: "متمم چیست؟ آموزش تعاملی متمم در دستور زبان فارسی",
    description:
      "متمم را با حرف اضافه پیدا کن: آموزش قدم‌به‌قدمِ متمم، دام‌های «چون» و «را»، ضمیرِ متممی و فعل‌هایی که متمم می‌خواهند، با مثال‌های فارسی دهم تا دوازدهم.",
    section: "learn",
    priority: 0.7,
    changeFrequency: "monthly",
  }),
  "/exam": page({
    path: "/exam",
    name: "امتحانات نهایی",
    title: "نمونه‌سؤال امتحان نهایی فارسی و علوم و فنون — آزمون آنلاین",
    description:
      "نمونه‌سؤال‌های امتحان نهایی فارسی و علوم و فنون ادبی را آنلاین بزن و نمره و بازخوردِ هر سؤال را ببین؛ به تفکیکِ قلمرو زبانی، ادبی و فکری.",
    section: "tool",
    priority: 0.8,
    changeFrequency: "weekly",
  }),
  "/game": page({
    path: "/game",
    name: "بازی‌ها",
    title: "بازی‌های آموزشی ادبیات فارسی — آرایه، دستور زبان و وزن شعر",
    description:
      "ده بازی برای تمرینِ ادبیات فارسی: نقش دستوری، آرایه‌های ادبی، واژگان، تقطیع و وزن شعر؛ از جاسوس نقش‌ها و نینجای دستور تا کیمیای وزن و رنگ‌آرا.",
    section: "game",
    priority: 0.8,
    changeFrequency: "monthly",
  }),
  "/sarvaclub": page({
    path: "/sarvaclub",
    name: "سروا کلاب",
    title: "سروا کلاب — انجمن شعر و سروده‌های دانش‌آموزان",
    description:
      "انجمن شعر سروا: سروده‌ات را با نام خودت یا بی‌نام منتشر کن، سروده‌های دیگران را بخوان و برایشان دیدگاه بنویس.",
    section: "community",
    priority: 0.8,
    changeFrequency: "daily",
  }),
  "/guide": page({
    path: "/guide",
    name: "راهنما",
    title: "راهنمای سروا",
    description:
      "هر بخشِ سروا در چند خط: درسنامه، عروض سماعی، وزن‌یاب، بازی‌های ادبی و دستوری، امتحان‌های نهایی و پنلِ پیشرفت.",
    section: "info",
    priority: 0.6,
    changeFrequency: "monthly",
  }),
  "/about": page({
    path: "/about",
    name: "دربارهٔ سروا",
    title: "دربارهٔ سروا",
    description:
      "سروا برای آموزش ادبیات فارسی ساخته شده: درسنامه، عروض و وزن شعر، واژه‌ها و آرایه‌ها، و بازی‌های تمرینی. اینجا می‌خوانید سروا چیست و چه کسانی می‌سازندش.",
    section: "info",
    priority: 0.5,
    changeFrequency: "yearly",
  }),
  "/plus": page({
    path: "/plus",
    name: "سروا پلاس",
    title: "سروا پلاس",
    description:
      "اشتراک سروا پلاس: نقش دستوری و آرایه‌های درسنامه، هوشواره، تحلیل اشتباه‌ها در وزن و دستور، و تمرین پیشنهادی روزانه.",
    section: "info",
    priority: 0.6,
    changeFrequency: "monthly",
    conditional: "plus",
  }),

  // ── بازی‌ها ───────────────────────────────────────────────────────────────
  "/game/jasoos": page({
    path: "/game/jasoos",
    name: "جاسوس نقش‌ها",
    title: "جاسوس نقش‌ها — بازی نقش دستوری و آرایه‌های ادبی",
    description:
      "یک بیت، چهار مظنون، یک دروغگو؛ نقش‌های دستوری و آرایه‌های ادبی بیت‌های کتاب فارسی را با جاسوس‌یابی تمرین کن.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/ninja": page({
    path: "/game/ninja",
    name: "نینجای دستور زبان",
    title: "نینجای دستور زبان — بازی تشخیص نقش و نوع کلمه",
    description:
      "کلمه‌ها در هوا پرتاب می‌شوند و فقط باید دستهٔ درست را برش بزنی؛ تمرینِ سریع و سرگرم‌کنندهٔ دستور زبان فارسی.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/pairs": page({
    path: "/game/pairs",
    name: "جفت‌های ادبی",
    title: "جفت‌های ادبی — بازی اثر و پدیدآورنده (تاریخ ادبیات)",
    description:
      "پایه و آزمونت را انتخاب کن و هر اثر را از حافظه به پدیدآورنده‌اش برسان؛ تمرینِ تاریخ ادبیاتِ کتاب‌های فارسی دبیرستان.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/aruz-rapid": page({
    path: "/game/aruz-rapid",
    name: "تقطیع سریع",
    title: "تقطیع سریع — بازی تشخیص هجای کوتاه و بلند",
    description:
      "یک مصراعِ اعراب‌گذاری‌شده را ببین، پوشیده می‌شود و واحدهای عروضی یکی‌یکی می‌آیند: کوتاه یا بلند؟ تمرینِ تقطیعِ هجایی برای عروض.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/vocab": page({
    path: "/game/vocab",
    name: "واژه‌یاب",
    title: "واژه‌یاب — بازی معنی واژه‌های کتاب فارسی",
    description:
      "تصویر را ببین، واژه‌اش را بشناس و معنی کامل را یاد بگیر؛ تمرینِ تصویریِ واژگانِ کتاب‌های فارسی دبیرستان.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/aruz-bridge": page({
    path: "/game/aruz-bridge",
    name: "پل وزن",
    title: "پل وزن — بازی تشخیص وزن عروضی واژه‌ها",
    description:
      "روی پلِ شیشه‌ای، وزنِ عروضیِ هر واژه را تشخیص بده و روی شیشهٔ امن بپر. اشتباه کنی، شیشه زیرِ پایت می‌شکند.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/grammar-circuit": page({
    path: "/game/grammar-circuit",
    name: "مدار دستور",
    title: "مدار دستور — بازی نقش دستوری واژه‌ها",
    description:
      "نقشِ دستوریِ هر واژه را به سوکتِ خودش وصل کن، مدار را ببند و لامپ را روشن کن؛ تمرینِ نهاد، مفعول، متمم و مسند.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/role-hunt": page({
    path: "/game/role-hunt",
    name: "شکار نقش‌ها",
    title: "شکار نقش‌ها — بازی سرعتی نقش دستوری",
    description:
      "نقشی که نمایشگر رو می‌کند را ببین و واژه‌ای که آن نقش را دارد از میانِ واژه‌های در حالِ چرخش انتخاب کن.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/kimia": page({
    path: "/game/kimia",
    name: "کیمیای وزن",
    title: "کیمیای وزن — بازی ساختنِ وزن شعر با ارکان عروضی",
    description:
      "ریتمِ بیت را بشنو، ارکانِ عروضی را مثلِ جوهرِ رنگی به مخزن تزریق کن و وزنِ مصراع را بساز؛ ترکیبِ درست پایدار می‌شود.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
  "/game/rang-ara": page({
    path: "/game/rang-ara",
    name: "رنگ‌آرا",
    title: "رنگ‌آرا — بازی تشبیه، استعاره، مجاز و کنایه",
    description:
      "مشبّه، مشبّه‌به، استعاره، مجاز و کنایه را در بیت‌های درس‌های فارسی پیدا کن و با رنگِ همان آرایه رنگشان کن.",
    section: "game",
    priority: 0.7,
    changeFrequency: "monthly",
    schema: "game",
  }),
} as const satisfies Record<string, SeoPage>;

export type SeoPath = keyof typeof SEO_PAGES;

export const SEO_PAGE_LIST: readonly SeoPage[] = Object.values(SEO_PAGES);

export const SECTION_LABEL: Record<SeoSection, string> = {
  core: "صفحه‌های اصلی",
  learn: "آموزش",
  tool: "ابزارها و آزمون‌ها",
  game: "بازی‌های آموزشی",
  community: "انجمن",
  info: "دربارهٔ سروا",
};

/* ─────────────────────────── درس‌ها: عددِ ترتیبی ─────────────────────────── */

const ORDINALS = [
  "",
  "اول",
  "دوم",
  "سوم",
  "چهارم",
  "پنجم",
  "ششم",
  "هفتم",
  "هشتم",
  "نهم",
  "دهم",
  "یازدهم",
  "دوازدهم",
  "سیزدهم",
  "چهاردهم",
  "پانزدهم",
  "شانزدهم",
  "هفدهم",
  "هجدهم",
];

/**
 * «اول»، «دوم»، … «هجدهم».
 *
 * ⚠️ چرا عددِ ترتیبی و نه «درس ۱»: دانش‌آموز «معنی درس اول فارسی یازدهم»
 * جست‌وجو می‌کند، نه «درس ۱». عنوانی که همان عبارت را دارد، هم بیشتر دیده
 * می‌شود و هم در نتیجه پررنگ (bold) می‌شود. «اول» و نه «یکم» به همان دلیل:
 * شکلِ رایج‌ترِ جست‌وجوست.
 */
export function lessonOrdinal(n: number): string {
  return ORDINALS[n] ?? String(n);
}
