import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // بستهٔ ساخته‌شده برای هاست — خروجی است، نه سورس.
    "deploy/**",
  ]),

  // ⚠️ فایل شروعِ cPanel عمداً CommonJS است.
  //
  // Phusion Passenger آن را با require() بار می‌کند و خروجی standalone خودِ
  // Next هم (server.js) CommonJS است. تبدیلش به ESM یعنی شکستنِ همان چیزی
  // که باید کار کند، برای رعایتِ قاعده‌ای که اینجا موضوعیت ندارد.
  {
    files: ["cpanel-app.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },

  // ⚠️ کدِ صحنهٔ سه‌بعدی: `react-hooks/immutability` اینجا خاموش است.
  //
  // این قاعده از کامپایلرِ React می‌آید و می‌گوید مقداری که در رندر ساخته
  // شده (مثلاً خروجیِ `useMemo`) نباید بعداً تغییر کند. برای کدِ معمولیِ
  // React درست است.
  //
  // ولی مدلِ برنامه‌نویسیِ react-three-fiber دقیقاً همین است: صحنه یک گرافِ
  // *پایا* از اشیای three است و هر فریم با نوشتنِ مستقیم به‌روز می‌شود —
  // `mesh.position.set(...)`، `material.opacity = ...`، `camera.lookAt(...)`.
  // این نوشتن‌ها در `useFrame` رخ می‌دهند که یک callbackِ بیرون از رندر
  // است، نه در بدنهٔ رندر.
  //
  // جایگزینش این بود که هر شیءِ three در یک `useRef` پیچیده شود و همه‌جا
  // `.current` بخورد؛ یعنی همان جهش، با یک لایه سروصدای اضافه و بدونِ هیچ
  // ایمنیِ بیشتر.
  //
  // ⚠️ دامنه عمداً تنگ است — فقط پوشه‌های صحنهٔ WebGL. بقیهٔ سروا، از جمله
  // لایه‌های هماهنگیِ همین بازی‌ها، هنوز زیرِ قاعده‌اند. قاعده‌های دیگرِ
  // کامپایلر (`purity`، `refs`، `set-state-in-effect`) هم دست‌نخورده‌اند،
  // چون آن‌ها در کدِ سه‌بعدی هم اشکالِ واقعی‌اند.
  {
    files: [
      "components/UI/poets-shelf/scene/**",
      "components/UI/aruz-bridge/scene/**",
      "components/UI/galaxy/**",
    ],
    rules: { "react-hooks/immutability": "off" },
  },
]);

export default eslintConfig;
