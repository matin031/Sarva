import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // خروجیِ خودبسنده برای داکر: به‌جای کلِ node_modules، فقط فایل‌هایی که
  // ردیابیِ import واقعاً به آن‌ها رسیده کپی می‌شوند. تفاوتش صدها مگابایت است.
  output: "standalone",

  // sharp با import معمولی وارد می‌شود (lib/vocab-watermark.ts) ولی باینریِ
  // نیتیوش را ردیاب نمی‌بیند — چیزی که می‌بیند یک require از روی رشته است.
  // بدون این خط، /api/vocab-image در کانتینر با «Could not load the sharp
  // module» می‌افتد، در حالی که لوکال بی‌عیب کار می‌کند.
  outputFileTracingIncludes: {
    "/api/vocab-image": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
  },
};

export default nextConfig;
