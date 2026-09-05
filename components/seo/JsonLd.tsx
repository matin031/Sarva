import { safeJsonLd } from "@/lib/seo/jsonld";

/**
 * یک بلوکِ JSON-LD.
 *
 * ⚠️ همیشه از `safeJsonLd` رد می‌شود و نه `JSON.stringify` خام — چون بعضی از
 * این داده‌ها متنِ کاربر است (عنوانِ سروده، تخلصِ شاعر). توضیحِ کامل در
 * lib/seo/jsonld.ts.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
