"use client";

/**
 * خطا در خودِ layoutِ ریشه — آخرین تور.
 *
 * ⚠️ اینجا layout و فونت‌ها و `globals.css` وجود ندارند (همان چیزی است که
 * شکسته)، پس `<html>` و `<body>` را خودش می‌سازد و استایلش درون‌خطی است.
 * عمداً ساده: یک جمله، یک دکمه، و کد پیگیری.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Vazirmatn, Tahoma, sans-serif",
          background: "#f8f5ee",
          color: "#1d2733",
          textAlign: "center",
        }}
      >
        <div style={{ padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>مشکلی پیش آمد</h1>
          <p style={{ color: "#5b6674", marginTop: 12 }}>سایت باز نشد. چند لحظه بعد دوباره امتحان کن.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              minHeight: 44,
              padding: "0 24px",
              border: 0,
              borderRadius: 12,
              background: "#008687",
              color: "#fff",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            تلاش دوباره
          </button>
          {error.digest ? (
            <p style={{ marginTop: 24, fontSize: 12, color: "#5b6674" }}>
              کد پیگیری: <bdi dir="ltr">{error.digest}</bdi>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
