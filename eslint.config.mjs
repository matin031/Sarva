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
]);

export default eslintConfig;
