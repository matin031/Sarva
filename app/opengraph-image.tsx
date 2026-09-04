import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "سروا | آموزش ادبیات فارسی";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * فونت را از گوگل می‌گیرد.
 *
 * ⚠️ این تابع پیش از این هیچ مدیریتِ خطایی نداشت: یک `fetch` ناموفق —
 * قطعیِ شبکه، فیلترینگ، یا کندیِ گوگل — استثنا می‌داد و *کلِ* مسیرِ تصویر
 * ۵۰۰ می‌شد. یعنی هر جا لینکِ سایت فرستاده می‌شد (تلگرام، واتساپ، ایتا)
 * پیش‌نمایش خالی می‌آمد، و هیچ‌کس هم نمی‌فهمید چرا.
 *
 * حالا شکست بی‌صداست و تصویر بدونِ فونتِ سفارشی ساخته می‌شود.
 *
 * ⚠️ ولی این هنوز راهِ حلِ کامل نیست: بدونِ فونتِ فارسی، حروف به‌شکلِ مربع
 * رندر می‌شوند. راهِ درست، *بستنِ فونت به خودِ مخزن* است تا هیچ درخواستِ
 * بیرونی در مسیرِ ساختِ تصویر نباشد. آن کار به فایلِ فونت نیاز دارد که در
 * این محیط قابل دانلود نبود؛ دستورش در گزارش آمده و کارِ مالک است.
 */
async function getVazirmatnFont(): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@700&display=swap",
      { signal: AbortSignal.timeout(4000) },
    );
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const fontUrl = css.match(/src: url\(([^)]+)\) format\('woff2'\)/)?.[1];
    if (!fontUrl) return null;
    const fontRes = await fetch(fontUrl, { signal: AbortSignal.timeout(4000) });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image() {
  const fontData = await getVazirmatnFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f1115",
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(212,175,55,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(212,175,55,0.15), transparent 45%)",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 700,
            color: "#f5ecd7",
            fontFamily: "Vazirmatn",
          }}
        >
          سروا
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 38,
            color: "#d4af37",
            fontFamily: "Vazirmatn",
            textAlign: "center",
          }}
        >
          درسنامه، عروض و بازی‌های ادبیات فارسی
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: "Vazirmatn", data: fontData, weight: 700, style: "normal" }]
        : [],
    }
  );
}
