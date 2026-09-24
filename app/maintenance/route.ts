import { maintenanceState, RETRY_AFTER_SECONDS } from "@/lib/site/maintenance";

/**
 * صفحهٔ «در حال بروزرسانی».
 *
 * =============================================================================
 * ⚠️ چرا Route Handler و نه یک `page.tsx`
 * =============================================================================
 *
 * دو دلیل، و هر دو تعیین‌کننده‌اند:
 *
 * ۱) **کدِ وضعیت.** یک صفحهٔ App Router نمی‌تواند ۵۰۳ برگرداند؛ هر رندرِ
 *    موفق ۲۰۰ است. و ۲۰۰ دقیقاً همان چیزی است که نباید باشد: گوگل صفحهٔ
 *    «برمی‌گردیم» را محتوای واقعیِ آن آدرس می‌فهمد و در نتایج می‌نشاند.
 *    چند روز بروزرسانی می‌تواند ماه‌ها رتبه ببرد. ۵۰۳ + `Retry-After`
 *    یعنی «موقتاً»، و هیچ صفحه‌ای از فهرست بیرون نمی‌رود.
 *
 * ۲) **استقلال.** صفحه‌ای که می‌گوید سایت بالا نیست، نباید خودش به چیزی که
 *    بالا نیست وابسته باشد. اینجا نه layout هست، نه provider، نه یک
 *    کامپوننتِ مشترک که فردا کسی به آن `useSession` اضافه کند. یک رشتهٔ
 *    HTML، بدونِ JS، بدونِ فونتِ بیرونی.
 *
 * ⚠️ فونت و نشان: فایل‌های ثابتِ `public/` — `maintenance-assets/` (مربّع برای
 * عنوان، وزیرمتن برای متن؛ همان دو قلمِ سایت) و `favicon.svg` (نشانِ سروا).
 * از `next/font` نمی‌آیند چون این صفحه layout ندارد. matcherِ proxy فایل‌های
 * svg و woff2 را رد می‌کند، پس در حالتِ بروزرسانی هم بار می‌شوند.
 *
 * ⚠️ `no-store`: این پاسخ نباید در هیچ کشِ میانی‌ای بماند. اگر بماند،
 * دقیقهٔ بعد از تمام شدنِ بروزرسانی هم بعضی‌ها همین را می‌بینند.
 */

export const dynamic = "force-dynamic";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DEFAULT_MESSAGE = "داریم چند چیز را درست می‌کنیم. زود برمی‌گردیم.";

function html(message: string): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>سروا | در حال بروزرسانی</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/maintenance-assets/Morabba-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/maintenance-assets/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>
<style>
  @font-face { font-family: "Morabba"; src: url("/maintenance-assets/Morabba-Bold.woff2") format("woff2"); font-weight: 700; font-display: swap; }
  @font-face { font-family: "Vazirmatn"; src: url("/maintenance-assets/Vazirmatn-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
  @font-face { font-family: "Vazirmatn"; src: url("/maintenance-assets/Vazirmatn-Medium.woff2") format("woff2"); font-weight: 500; font-display: swap; }

  :root {
    color-scheme: dark;
    --bg: #05090f;
    --teal: #0DBFC3;
    --ink: #eef4f7;
    --muted: #8d9bb0;
    --faint: #3a4658;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: 32px 16px;
    background: var(--bg);
    color: var(--ink);
    font-family: Vazirmatn, Tahoma, system-ui, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* شفقِ پس‌زمینه: دو لکهٔ رنگ که آرام جابه‌جا می‌شوند. فقط transform
     متحرک است تا روی گوشیِ ضعیف هم روان بماند. */
  .aurora { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .aurora::before, .aurora::after {
    content: ""; position: absolute; width: 70vmax; height: 70vmax; border-radius: 50%;
    will-change: transform;
  }
  .aurora::before {
    top: -38vmax; right: -18vmax;
    background: radial-gradient(circle, rgba(13,191,195,.22) 0%, rgba(13,191,195,0) 62%);
    animation: drift-a 18s ease-in-out infinite alternate;
  }
  .aurora::after {
    bottom: -42vmax; left: -22vmax;
    background: radial-gradient(circle, rgba(64,104,214,.16) 0%, rgba(64,104,214,0) 62%);
    animation: drift-b 22s ease-in-out infinite alternate;
  }
  @keyframes drift-a { to { transform: translate(-8vmax, 6vmax) scale(1.08); } }
  @keyframes drift-b { to { transform: translate(7vmax, -5vmax) scale(1.12); } }

  /* شبکهٔ نقطه‌ای کم‌رنگ که فقط دورِ مرکز دیده می‌شود. */
  .grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: radial-gradient(ellipse 60% 55% at 50% 45%, #000 0%, transparent 75%);
            mask-image: radial-gradient(ellipse 60% 55% at 50% 45%, #000 0%, transparent 75%);
  }

  .box {
    position: relative; z-index: 1;
    width: 100%; max-width: 440px; text-align: center;
    animation: rise .8s cubic-bezier(.2,.7,.2,1) both;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(12px); } }

  /* نشان داخلِ یک حلقهٔ چرخان — حلقه همان «کاری در جریان است». */
  .mark { position: relative; width: 132px; height: 132px; margin: 0 auto 34px; display: grid; place-items: center; }
  .mark::before {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    background: conic-gradient(from 0deg, rgba(13,191,195,0) 0deg, rgba(13,191,195,0) 200deg, var(--teal) 360deg);
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px));
            mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px));
    animation: spin 2.4s linear infinite;
  }
  .mark::after {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    border: 1px solid rgba(255,255,255,.06);
  }
  .glow {
    position: absolute; inset: 14px; border-radius: 50%;
    background: radial-gradient(circle, rgba(13,191,195,.26) 0%, rgba(13,191,195,0) 68%);
    animation: breathe 3.2s ease-in-out infinite;
  }
  .mark img { position: relative; width: auto; height: 76px; display: block; filter: drop-shadow(0 6px 18px rgba(13,191,195,.35)); }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes breathe { 0%, 100% { opacity: .55; transform: scale(.94); } 50% { opacity: 1; transform: scale(1.04); } }

  h1 {
    margin: 0;
    font-family: Morabba, Vazirmatn, Tahoma, sans-serif;
    font-weight: 700; font-size: 30px; line-height: 1.5; letter-spacing: 0;
  }
  .msg { margin: 10px 0 0; font-size: 15px; line-height: 28px; color: var(--muted); }

  .verse {
    margin: 34px auto 0; padding: 18px 20px; max-width: 360px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015));
    border: 1px solid rgba(255,255,255,.07);
  }
  .verse p { margin: 0; font-weight: 500; font-size: 15px; line-height: 30px; color: #cfe7ea; }
  .verse cite { display: block; margin-top: 8px; font-style: normal; font-size: 12px; color: var(--faint); }

  .foot { margin-top: 30px; font-size: 12px; color: var(--faint); }
  .foot b { color: var(--teal); font-weight: 500; }

  @media (max-width: 420px) {
    h1 { font-size: 25px; }
    .mark { width: 116px; height: 116px; margin-bottom: 28px; }
    .mark img { height: 66px; }
  }

  /* ⚠️ کسی که حرکت را خاموش کرده، نباید چیزِ چرخان یا شناور ببیند. */
  @media (prefers-reduced-motion: reduce) {
    .aurora::before, .aurora::after, .mark::before, .glow, .box { animation: none; }
  }
</style>
</head>
<body>
  <div class="aurora" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>
  <main class="box">
    <div class="mark"><span class="glow" aria-hidden="true"></span><img src="/favicon.svg" height="76" alt="سروا"></div>
    <h1>سروا در حال بروزرسانی است</h1>
    <p class="msg">${esc(message)}</p>
    <figure class="verse">
      <p>یوسف گم‌گشته بازآید به کنعان غم مخور</p>
      <p>کلبهٔ احزان شود روزی گلستان غم مخور</p>
      <cite>حافظ</cite>
    </figure>
    <div class="foot"><b>سروا</b> · آموزش ادبیات فارسی</div>
  </main>
</body>
</html>`;
}

export async function GET(): Promise<Response> {
  const state = await maintenanceState();

  /* ⚠️ کدِ وضعیت به روشن بودنِ کلید بسته است و نه به مسیر.
     کسی که ‎/maintenance‎ را دستی باز می‌کند در حالی که سایت بالاست، یک
     صفحهٔ سالم می‌بیند و نه یک ۵۰۳ — وگرنه یک آدرسِ عادیِ سایت برای همیشه
     در گزارشِ خطاهای گوگل می‌نشست. */
  const status = state.on ? 503 : 200;

  const headers: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, must-revalidate",
    "x-robots-tag": "noindex",
  };
  if (state.on) headers["retry-after"] = String(RETRY_AFTER_SECONDS);

  return new Response(html(state.message ?? DEFAULT_MESSAGE), { status, headers });
}
