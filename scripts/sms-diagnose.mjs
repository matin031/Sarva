#!/usr/bin/env node
// عیب‌یابیِ پیامکِ SMS.ir.
//
// این اسکریپت باید روی *همان سروری* اجرا شود که پیامک از آن می‌رود: اگر برای
// کلیدِ API محدودیتِ IP گذاشته باشید، تنها چیزی که SMS.ir می‌بیند IPِ خروجیِ
// همان ماشین است.
//
// ⚠️ چرا IP جدا بررسی می‌شود: IPی که در DNS برای دامنه ثبت شده همیشه همان IPی
// نیست که درخواست‌های *خروجیِ* سرور با آن بیرون می‌روند. روی هاستِ اشتراکیِ
// cPanel این دو معمولاً یکی نیستند.
//
// اجرا (از پوشهٔ برنامه روی سرور):
//     node scripts/sms-diagnose.mjs
//
// و اگر خواستید یک پیامکِ واقعی هم فرستاده شود:
//     node scripts/sms-diagnose.mjs 09xxxxxxxxx
//
// بدونِ شماره هیچ پیامکی ارسال نمی‌شود؛ فقط اعتبارِ حساب خوانده می‌شود —
// درخواستی که از همان دروازهٔ احراز هویت و همان محدودیتِ IP رد می‌شود.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://api.sms.ir";

/** ⚠️ باید با OTP_PARAMETER_NAME در lib/sms/smsir.ts یکی باشد. */
const PARAMETER_NAME = "Code";

// ----------------------------------------------------------------- env --

/* همان خوانندهٔ کوچکِ cpanel-app.js. عمداً کپی شده و نه import: آن فایل در
   لحظهٔ require کلِ برنامه را بالا می‌آورد. */
function loadEnvFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return 0;
  }

  let count = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
      count += 1;
    }
  }
  return count;
}

// ------------------------------------------------------------- تنظیمات --

/**
 * همان ترتیبی که lib/settings دارد: جدول app_settings → متغیر محیطی → null.
 *
 * ⚠️ اگر این ترتیب رعایت نشود، اسکریپت ممکن است با کلیدی تست کند که برنامه
 * اصلاً از آن استفاده نمی‌کند — گمراه‌کننده‌ترین حالتِ ممکن.
 */
const KEYS = [
  ["sms.driver", "SMS_DRIVER"],
  ["sms.api_key", "SMS_API_KEY"],
  ["sms.template_id", "SMS_TEMPLATE_ID"],
  ["sms.sender", "SMS_SENDER"],
];

async function resolveSettings() {
  const values = {};
  const source = {};
  for (const [key, envVar] of KEYS) {
    values[key] = process.env[envVar] || null;
    source[key] = values[key] ? "env" : "—";
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("⚠️ DATABASE_URL نبود؛ فقط از .env خوانده شد.");
    return { values, source };
  }

  const conn = await mysql.createConnection({ uri: url });
  try {
    const [rows] = await conn.query(
      "select `key`, value from app_settings where `key` like 'sms.%'",
    );
    for (const row of rows) {
      // ستون از نوع JSON است؛ رشته‌ها به‌صورت رشتهٔ JS برمی‌گردند.
      const value = typeof row.value === "string" ? row.value : String(row.value ?? "");
      if (value) {
        values[row.key] = value;
        source[row.key] = "دیتابیس";
      }
    }
  } finally {
    await conn.end();
  }

  return { values, source };
}

/** کلید هرگز کامل چاپ نمی‌شود؛ این خروجی ممکن است در تیکت و چت بچرخد. */
function mask(value) {
  if (!value) return "(خالی)";
  if (value.length <= 10) return `${value.slice(0, 2)}…(${value.length} نویسه)`;
  return `${value.slice(0, 6)}…${value.slice(-4)} (${value.length} نویسه)`;
}

// ------------------------------------------------------------ IP خروجی --

/** چند سرویس، چون هر کدام ممکن است از داخل ایران در دسترس نباشد. */
const IP_ECHOS = [
  "https://api.ipify.org",
  "https://ipv4.icanhazip.com",
  "https://ifconfig.me/ip",
  "https://checkip.amazonaws.com",
];

async function outboundIps() {
  const seen = new Map();
  for (const url of IP_ECHOS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      const ip = (await res.text()).trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        seen.set(ip, [...(seen.get(ip) ?? []), new URL(url).host]);
      }
    } catch {
      // در دسترس نبود؛ بعدی.
    }
  }
  return seen;
}

// ------------------------------------------------------------- SMS.ir --

/**
 * یک درخواستِ خام به SMS.ir.
 *
 * ⚠️ اینجا عمداً از SDK استفاده نمی‌شود: اسکریپتِ عیب‌یابی باید *همهٔ* پاسخ را
 * نشان بدهد، از جمله وقتی اصلاً JSON نیست. SDK خطاهای غیرِ ۲xx را throw
 * می‌کند و همان چیزی را قایم می‌کند که دنبالش هستیم.
 */
async function call(method, pathname, apiKey, body) {
  const res = await fetch(`${ENDPOINT}${pathname}`, {
    method,
    headers: {
      "X-API-KEY": apiKey,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await res.text().catch(() => "");
  return { httpStatus: res.status, raw };
}

/** ۴۰۱/۴۰۳ یعنی کلید یا IP؛ همان چیزی که بیشترین وقت را می‌گیرد. */
function authHint(httpStatus) {
  if (httpStatus === 401) return "کلیدِ API پذیرفته نشد.";
  if (httpStatus === 403) return "کلید درست است ولی دسترسی رد شد — معمولاً محدودیتِ IP.";
  return null;
}

// --------------------------------------------------------------- اجرا --

async function main() {
  const receptor = process.argv[2] ?? null;

  console.log(`.env: ${loadEnvFile(path.join(ROOT, ".env"))} مقدار خوانده شد\n`);

  console.log("── تنظیمات پیامک ─────────────────────────────────────");
  const { values, source } = await resolveSettings();
  for (const [key] of KEYS) {
    const shown = key === "sms.api_key" ? mask(values[key]) : (values[key] ?? "(خالی)");
    console.log(`  ${key.padEnd(16)} = ${shown}   [${source[key]}]`);
  }

  const apiKey = values["sms.api_key"];
  const templateId = Number((values["sms.template_id"] ?? "").trim());

  console.log("\n── IP خروجیِ این سرور ────────────────────────────────");
  const ips = await outboundIps();
  if (ips.size === 0) {
    console.log("  هیچ سرویسی پاسخ نداد. با دست امتحان کنید:");
    console.log("      curl -s https://api.ipify.org");
  } else {
    for (const [ip, hosts] of ips) console.log(`  ${ip}   (${hosts.join("، ")})`);
    if (ips.size > 1) {
      console.log("  ⚠️ بیش از یک IP دیده شد؛ اگر محدودیتِ IP گذاشته‌اید هر دو باید مجاز باشند.");
    }
  }

  if (!apiKey) {
    console.log("\nکلیدِ SMS.ir ثبت نشده؛ آزمونِ واقعی انجام نشد.");
    return;
  }

  console.log("\n── آزمونِ SMS.ir ─────────────────────────────────────");

  if (receptor) {
    if (!Number.isInteger(templateId) || templateId <= 0) {
      console.log("  شناسهٔ قالب ثبت نشده یا عدد نیست؛ ارسالِ آزمایشی ممکن نیست.");
      return;
    }

    /* کدِ آزمایشی عمداً ثابت و بی‌ارزش است — این اسکریپت هرگز کدِ واقعیِ کسی
       را نمی‌فرستد و نمی‌نویسد. */
    console.log(`  ارسالِ واقعی با قالبِ ${templateId} به ${receptor} …`);
    const { httpStatus, raw } = await call("POST", "/v1/send/verify", apiKey, {
      Mobile: receptor,
      TemplateId: templateId,
      Parameters: [{ name: PARAMETER_NAME, value: "12345" }],
    });
    console.log(`  HTTP ${httpStatus} — ${raw.slice(0, 400)}`);

    const hint = authHint(httpStatus);
    if (hint) {
      console.log(`\n  ⇒ ${hint}`);
      return;
    }

    let logical = null;
    try {
      logical = JSON.parse(raw)?.status ?? null;
    } catch {
      // پاسخ JSON نبود؛ خودِ متنِ بالا گویاست.
    }
    console.log(
      logical === 1
        ? "\n  ⇒ SMS.ir ارسال را پذیرفت. اگر پیامک نرسید، مشکل در قالب یا اپراتور است."
        : "\n  ⇒ ارسال پذیرفته نشد. ⚠️ کدِ HTTP ۲۰۰ اینجا معنیِ «رفت» نمی‌دهد؛ عددِ status بالا را ببینید.",
    );
    return;
  }

  /* بدونِ شماره: خواندنِ اعتبار. هیچ پیامکی نمی‌فرستد ولی از همان دروازهٔ
     احراز هویت و همان محدودیتِ IP رد می‌شود. */
  console.log("  (بدون ارسالِ پیامک — فقط بررسیِ کلید، دسترسی و اعتبار)");
  const { httpStatus, raw } = await call("GET", "/v1/credit", apiKey);
  console.log(`  HTTP ${httpStatus} — ${raw.slice(0, 400)}`);

  const hint = authHint(httpStatus);
  console.log(
    hint
      ? `\n  ⇒ ${hint}`
      : "\n  ⇒ کلید پذیرفته شد.\n     برای آزمونِ ارسال: node scripts/sms-diagnose.mjs 09xxxxxxxxx",
  );
}

main().catch((err) => {
  console.error("\nاسکریپت شکست خورد:", err?.message ?? err);
  process.exit(1);
});
