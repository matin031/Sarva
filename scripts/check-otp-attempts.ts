/**
 * سقفِ تلاشِ کدِ یک‌بارمصرف را زیر فشارِ همزمانی می‌سنجد — `npm run db:check-otp`.
 *
 * چرا اینجا و نه در tests/: چیزی که آزموده می‌شود رفتارِ Postgres زیر قفلِ
 * ردیف است، نه منطقِ TypeScript. با mock کردنِ دیتابیس دقیقاً همان چیزی
 * آزموده می‌شد که نوشته‌ایم — و مسابقه هرگز دیده نمی‌شد. هم‌خانوادهٔ
 * db:check-rotation.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. با ایمیلِ otp-race@test.local کار می‌کند و در
 * پایان پاکش می‌کند.
 */
process.loadEnvFile(".env.local");

import { query, execute, getPool } from "@/lib/db";
import { issueOtp, checkOtp } from "@/lib/auth/otp";

const EMAIL = "otp-race@test.local";
const MAX = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`);
  }
}

async function fresh() {
  await execute("delete from email_otps where email = $1", [EMAIL]);
  const issued = await issueOtp(EMAIL, "signup_verify", null);
  if (!issued.ok) throw new Error("صدور کد ناموفق بود: " + issued.error);
  return issued.code;
}

async function attemptsOf() {
  const rows = await query<{ attempts: number; consumed_at: string | null }>(
    `select attempts, consumed_at from email_otps
      where email = $1 order by created_at desc limit 1`,
    [EMAIL],
  );
  return rows[0];
}

/** کدی که قطعاً غلط است. */
function wrong(real: string) {
  return real === "000000" ? "111111" : "000000";
}

async function main() {
  console.log(`سقفِ تلاش: ${MAX}`);

  // ── ۱. پشتِ سر هم ────────────────────────────────────────────────────
  console.log("\n۱. حدس‌های پشتِ سر هم");
  const code1 = await fresh();
  const seq: boolean[] = [];
  for (let i = 0; i < MAX + 3; i++) {
    seq.push((await checkOtp(EMAIL, "signup_verify", wrong(code1))).ok);
  }
  check("هیچ حدسِ غلطی قبول نشد", seq.every((r) => r === false));
  const after1 = await attemptsOf();
  check("کد سوخت", after1.consumed_at !== null);
  check(
    "کدِ درست هم بعدش رد می‌شود",
    (await checkOtp(EMAIL, "signup_verify", code1)).ok === false,
  );

  // ── ۲. حدس‌های همزمان ───────────────────────────────────────────────
  console.log("\n۲. صد حدسِ همزمان");
  const code2 = await fresh();
  const burst = await Promise.all(
    Array.from({ length: 100 }, () => checkOtp(EMAIL, "signup_verify", wrong(code2))),
  );
  check("هیچ‌کدام قبول نشد", burst.every((r) => !r.ok));

  const after2 = await attemptsOf();
  // نکتهٔ اصلی: شمارنده باید واقعاً بالا رفته باشد. اگر همه با هم «۰» را
  // خوانده و «۱» نوشته باشند، مهاجم بی‌نهایت حدسِ همزمان دارد.
  check(
    "شمارنده گم نشد",
    after2.attempts >= MAX,
    `attempts = ${after2.attempts} (انتظار ≥ ${MAX})`,
  );
  check("کد سوخت", after2.consumed_at !== null);
  check(
    "کدِ درست بعد از رگبار رد می‌شود",
    (await checkOtp(EMAIL, "signup_verify", code2)).ok === false,
  );

  // ── ۳. کدِ درست، بدونِ فشار ──────────────────────────────────────────
  console.log("\n۳. مسیرِ سالم");
  const code3 = await fresh();
  check("کدِ درست قبول شد", (await checkOtp(EMAIL, "signup_verify", code3)).ok);
  check(
    "و بارِ دوم دیگر کار نمی‌کند",
    (await checkOtp(EMAIL, "signup_verify", code3)).ok === false,
  );

  // ── ۴. چند حدسِ غلط، بعد کدِ درست ────────────────────────────────────
  console.log("\n۴. چند غلط، بعد درست");
  const code4 = await fresh();
  for (let i = 0; i < MAX - 1; i++) {
    await checkOtp(EMAIL, "signup_verify", wrong(code4));
  }
  check(
    "کاربری که یکی مانده به سقف کدِ درست بزند وارد می‌شود",
    (await checkOtp(EMAIL, "signup_verify", code4)).ok,
  );

  await execute("delete from email_otps where email = $1", [EMAIL]);
  console.log(`\n${pass} قبول، ${fail} رد`);
  await getPool().end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await getPool().end();
  process.exit(1);
});
