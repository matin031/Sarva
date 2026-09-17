import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

/**
 * ⚠️ چرا این آزمون هست — یک خرابیِ واقعی که هیچ خطایی نداد.
 *
 * `NEXT_PUBLIC_*` را Next در زمانِ **build** داخلِ کد جاگذاری می‌کند و نه در
 * زمانِ اجرا. بستهٔ هاست روی ماشینِ توسعه ساخته می‌شود، جایی که `.env.local`
 * می‌گوید `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — پس همان رشته داخلِ
 * بسته به هاست می‌رفت و مقدارِ درستِ `.env`ِ روی هاست هرگز خوانده نمی‌شد.
 *
 * روی سایتِ زنده این دیده شد:
 *
 *     GET /robots.txt   →  Sitemap: http://localhost:3000/sitemap.xml
 *     GET /sitemap.xml  →  <loc>http://localhost:3000</loc>   (هر صفحه)
 *
 * یعنی گوگل برای کلِ سایت آدرسی می‌خواند که وجودِ خارجی ندارد، و لینکِ
 * دعوتی که دبیر کپی می‌کرد به localhost می‌رفت.
 *
 * ⚠️ این آزمون ماژول را در هر مورد از نو import می‌کند. `siteOrigin` مقدار را
 * کش نمی‌کند، ولی `process.env` را در زمانِ فراخوانی می‌خواند و node:test
 * موردها را در یک پروسه اجرا می‌کند — بدونِ بازنشانی، ترتیبِ اجرا نتیجه را
 * عوض می‌کرد.
 */

const ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "NODE_ENV", "ALLOW_LOCAL_SITE_URL"] as const;

let saved: Record<string, string | undefined> = {};

/** ⚠️ `NODE_ENV` در تایپِ Node فقط-خواندنی است؛ نوشتنش اینجا عمدی است. */
function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

/** ماژول با `?t=` تازه بارگذاری می‌شود تا مقدارِ محیطِ همین مورد را ببیند. */
async function loadSite() {
  return import(`@/lib/seo/site?t=${Math.random()}`);
}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const key of ENV_KEYS) setEnv(key, saved[key]);
});

describe("siteOrigin", () => {
  it("در production آدرسِ localhost را رد می‌کند", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("ALLOW_LOCAL_SITE_URL", undefined);
    setEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const { siteOrigin, absoluteUrl } = await loadSite();
    assert.equal(siteOrigin(), "https://sarvaedu.ir");
    assert.equal(absoluteUrl("/sitemap.xml"), "https://sarvaedu.ir/sitemap.xml");
  });

  it("در production آدرسِ شبکهٔ خصوصی را هم رد می‌کند", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("ALLOW_LOCAL_SITE_URL", undefined);
    setEnv("NEXT_PUBLIC_SITE_URL", "http://192.168.1.50:3000");

    const { siteOrigin } = await loadSite();
    assert.equal(siteOrigin(), "https://sarvaedu.ir");
  });

  it("در توسعه localhost را همان‌طور نگه می‌دارد", async () => {
    setEnv("NODE_ENV", "development");
    setEnv("ALLOW_LOCAL_SITE_URL", undefined);
    setEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const { siteOrigin } = await loadSite();
    assert.equal(siteOrigin(), "http://localhost:3000");
  });

  it("با ALLOW_LOCAL_SITE_URL در production هم localhost می‌ماند", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("ALLOW_LOCAL_SITE_URL", "true");
    setEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const { siteOrigin } = await loadSite();
    assert.equal(siteOrigin(), "http://localhost:3000");
  });

  it("دامنهٔ واقعی دست‌نخورده می‌ماند", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("ALLOW_LOCAL_SITE_URL", undefined);
    setEnv("NEXT_PUBLIC_SITE_URL", "https://sarvaedu.ir");

    const { siteOrigin } = await loadSite();
    assert.equal(siteOrigin(), "https://sarvaedu.ir");
  });
});
