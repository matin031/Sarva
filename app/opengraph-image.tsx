import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "عروضینو | آموزش وزن شعر فارسی";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getVazirmatnFont() {
  const cssRes = await fetch(
    "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@700&display=swap"
  );
  const css = await cssRes.text();
  const fontUrlMatch = css.match(/src: url\(([^)]+)\) format\('woff2'\)/);
  const fontUrl = fontUrlMatch?.[1];
  if (!fontUrl) return null;
  const fontRes = await fetch(fontUrl);
  return fontRes.arrayBuffer();
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
          عروضینو
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
          آموزش وزن و عروض شعر فارسی
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
