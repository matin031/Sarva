import { absoluteUrl, siteOrigin } from "./site";
import type { SeoPage } from "./catalog";

/**
 * هویتِ سروا برای موتورهای جست‌وجو و مدل‌های زبانی.
 *
 * ── چرا این مهم است (سئو و «جئو») ──────────────────────────────────────────
 *
 * گوگل و موتورهای پاسخ‌گو (ChatGPT، Gemini، Perplexity، Claude) دیگر فقط
 * صفحه‌ها را نمی‌بینند؛ *موجودیت* می‌سازند: «سروا یک سازمانِ آموزشی است، این
 * لوگو را دارد، این صفحه‌های اجتماعی مالِ اوست، این درس‌ها را منتشر کرده».
 * هر صفحه با `@id`ِ ثابت به همان یک موجودیت اشاره می‌کند، پس همهٔ درس‌ها و
 * بازی‌ها به یک برند جمع می‌شوند و نه صد صفحهٔ بی‌صاحب.
 *
 * ⚠️ `sameAs` (پیوند به صفحه‌های رسمیِ سروا در شبکه‌های اجتماعی) از پنلِ
 * مدیریت می‌آید و نه از کد، چون فقط مالک می‌داند کدام صفحه رسمی است. آنچه
 * در فوترِ سایت هست حسابِ شخصی است و به‌جای برند اعلام نمی‌شود.
 */

export const ORGANIZATION_ID = () => `${siteOrigin()}/#organization`;
export const WEBSITE_ID = () => `${siteOrigin()}/#website`;

export const BRAND_NAMES = ["سروا", "Sarva", "sarvaedu"] as const;

/** معرفیِ کوتاهِ سروا — همان جمله‌ای که دوست داریم یک مدلِ زبانی بگوید. */
export const DEFAULT_BRAND_SUMMARY =
  "سروا (sarvaedu.ir) پلتفرمِ آموزشِ ادبیات فارسی برای دانش‌آموزانِ دورهٔ دوم متوسطه است: معنی و شرحِ بیت‌به‌بیتِ درس‌های فارسی دهم، یازدهم و دوازدهم، آموزشِ عروض و وزنِ شعر با گوش، وزن‌یابِ آنلاین، نمونه‌سؤالِ امتحانِ نهایی و بازی‌های آموزشیِ دستور زبان و آرایه‌های ادبی.";

export type BrandProfile = {
  /** نشانی‌های رسمیِ سروا در شبکه‌های اجتماعی. */
  sameAs: string[];
  email: string | null;
  summary: string;
};

export const EMPTY_BRAND: BrandProfile = {
  sameAs: [],
  email: null,
  summary: DEFAULT_BRAND_SUMMARY,
};

/**
 * گرافِ پایهٔ همهٔ صفحه‌ها: `WebSite` و سازمان.
 *
 * ⚠️ این نسخه ثابت است و در لایوتِ ریشه می‌نشیند، پس به دیتابیس دست نمی‌زند
 * (وگرنه همهٔ صفحه‌های ایستا پویا می‌شدند). `sameAs` و ایمیل را صفحهٔ خانه
 * با همان `@id` اضافه می‌کند؛ موتورِ جست‌وجو گره‌های هم‌شناسه را یکی می‌کند.
 */
export function siteGraph(description: string) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID(),
        url: origin,
        name: "سروا",
        alternateName: [...BRAND_NAMES.slice(1)],
        description,
        inLanguage: "fa-IR",
        publisher: { "@id": ORGANIZATION_ID() },
      },
      {
        "@type": "EducationalOrganization",
        "@id": ORGANIZATION_ID(),
        name: "سروا",
        alternateName: [...BRAND_NAMES.slice(1)],
        url: origin,
        description,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/logo.png"),
          width: 1080,
          height: 1080,
        },
        image: absoluteUrl("/opengraph-image.png"),
        areaServed: { "@type": "Country", name: "Iran" },
        knowsLanguage: "fa",
        knowsAbout: [
          "ادبیات فارسی",
          "عروض و قافیه",
          "وزن شعر فارسی",
          "دستور زبان فارسی",
          "آرایه‌های ادبی",
          "تاریخ ادبیات فارسی",
          "امتحان نهایی فارسی",
        ],
      },
    ],
  };
}

/** بخشِ «پنل‌پذیرِ» سازمان: فقط وقتی مالک چیزی ثبت کرده، چیزی ساخته می‌شود. */
export function organizationProfileNode(brand: BrandProfile) {
  if (!brand.sameAs.length && !brand.email) return null;
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": ORGANIZATION_ID(),
    name: "سروا",
    url: siteOrigin(),
    ...(brand.sameAs.length ? { sameAs: brand.sameAs } : {}),
    ...(brand.email
      ? {
          email: brand.email,
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: brand.email,
            availableLanguage: ["fa"],
          },
        }
      : {}),
  };
}

/**
 * یک بازیِ آموزشی.
 *
 * ⚠️ `LearningResource` و نه `VideoGame`/`SoftwareApplication`: نتیجهٔ غنیِ
 * نرم‌افزار در گوگل بدونِ قیمت یا امتیاز ساخته نمی‌شود و هیچ‌کدام را نداریم
 * (و نمی‌سازیم). چیزی که واقعاً هست این است: یک منبعِ تمرینیِ تعاملی برای
 * یک مهارتِ مشخص — و همین را می‌گوییم.
 */
export function gameJsonLd(page: SeoPage) {
  const url = absoluteUrl(page.path);
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${url}#game`,
    name: page.name,
    headline: page.title,
    description: page.description,
    url,
    inLanguage: "fa-IR",
    learningResourceType: "بازی آموزشی",
    interactivityType: "active",
    educationalLevel: "دورهٔ دوم متوسطه",
    isPartOf: { "@id": `${absoluteUrl("/game")}#collection` },
    publisher: { "@id": ORGANIZATION_ID() },
  };
}

/** یک ابزارِ آنلاین (وزن‌یاب). */
export function toolJsonLd(page: SeoPage) {
  const url = absoluteUrl(page.path);
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: page.name,
    description: page.description,
    url,
    inLanguage: "fa-IR",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    publisher: { "@id": ORGANIZATION_ID() },
  };
}

/** فهرستِ یک مجموعه (بازی‌ها). */
export function collectionJsonLd(page: SeoPage, items: readonly Pick<SeoPage, "name" | "path">[]) {
  const url = absoluteUrl(page.path);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: page.name,
    description: page.description,
    url,
    inLanguage: "fa-IR",
    isPartOf: { "@id": WEBSITE_ID() },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  };
}

/**
 * یک سرودهٔ تأییدشدهٔ سروا کلاب.
 *
 * ⚠️ فقط برای `approved`: سرودهٔ در صفِ بررسی را فقط نویسنده‌اش می‌بیند و
 * صفحه‌اش `noindex` است. `commentCount` شمارشِ واقعیِ دیدگاه‌هاست؛ «امتیاز»
 * و «نظر» (`aggregateRating`/`review`) ساخته نمی‌شود چون پسندیدن امتیازدهی
 * نیست.
 *
 * ⚠️ متنِ کاربر است — این شیء فقط از راهِ `<JsonLd>` (یعنی `safeJsonLd`)
 * چاپ می‌شود.
 */
export function poemJsonLd(post: {
  id: string;
  name: string;
  authorName: string;
  genre: string;
  excerpt: string;
  publishedAt: string | null;
  updatedAt: string;
  commentCount: number;
}) {
  const url = absoluteUrl(`/sarvaclub/${post.id}`);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#poem`,
    name: post.name,
    headline: post.name,
    abstract: post.excerpt,
    genre: post.genre,
    url,
    inLanguage: "fa-IR",
    author: { "@type": "Person", name: post.authorName },
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    dateModified: post.updatedAt,
    commentCount: post.commentCount,
    isPartOf: { "@type": "CollectionPage", "@id": `${absoluteUrl("/sarvaclub")}#collection`, name: "سروا کلاب" },
    publisher: { "@id": ORGANIZATION_ID() },
  };
}
