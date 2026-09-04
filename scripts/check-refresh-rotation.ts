/**
 * چرخشِ refresh token را روی دیتابیسِ واقعی می‌سنجد — `npm run db:check-rotation`.
 *
 * چرا اینجا و نه در tests/: این تابع تنها با دیتابیسِ زنده معنی دارد. رفتارِ
 * حساسش (قفلِ `for update`، تفاوتِ «باطل‌شده با خروج» و «باطل‌شده با چرخش»،
 * ترتیبِ ده درخواستِ همزمان) چیزی است که فقط خودِ Postgres تصمیم می‌گیرد؛ با
 * mock کردنش دقیقاً همان چیزی را آزمایش می‌کردیم که نوشته‌ایم، نه چیزی که
 * اجرا می‌شود. `npm test` عمداً به دیتابیس نیاز ندارد، پس این جدا ماند —
 * هم‌خانوادهٔ db:check و db:check-audio.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. کاربرانی با ایمیلِ rot-*@test.local می‌سازد و
 * در پایان پاکشان می‌کند.
 */
process.loadEnvFile(".env.local");

import { query, execute, getPool } from "@/lib/db";
import {
  createSession,
  refreshSession,
  revokeSessionByToken,
  listActiveSessions,
  toAuthUser,
  type UserRow,
} from "@/lib/auth/session";
import { hashRefreshToken } from "@/lib/auth/tokens";

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

async function makeUser(email: string) {
  const rows = await query<UserRow>(
    `insert into users (email, password_hash, full_name, role)
     values ($1, 'x', 'کاربر آزمایشی', 'student')
     on conflict (email) do update set full_name = excluded.full_name
     returning id, email, full_name, role, email_verified_at, is_banned, created_at`,
    [email],
  );
  return toAuthUser(rows[0]);
}

async function sessionRow(token: string) {
  const rows = await query<{
    id: string;
    family_id: string;
    rotated_to: string | null;
    revoked_at: string | null;
    created_at: string;
    expires_at: string;
  }>(
    `select id, family_id, rotated_to, revoked_at, created_at, expires_at
       from sessions where refresh_token_hash = $1`,
    [hashRefreshToken(token)],
  );
  return rows[0] ?? null;
}

async function main() {
  await execute("delete from users where email like 'rot-%@test.local'");

  // ── ۱. چرخشِ عادی ────────────────────────────────────────────────────
  console.log("\n۱. چرخشِ عادی");
  const u1 = await makeUser("rot-1@test.local");
  const first = await createSession(u1, { userAgent: "TestAgent/1.0", ip: "10.0.0.7" });
  const r1 = await refreshSession(first.refreshToken);

  check("تازه‌سازی موفق بود", r1 !== null);
  check("توکنِ refresh تازه برگشت", !!r1?.tokens.refreshToken);
  check(
    "توکنِ تازه با قبلی فرق دارد",
    r1?.tokens.refreshToken !== first.refreshToken,
  );

  const old1 = await sessionRow(first.refreshToken);
  const new1 = await sessionRow(r1!.tokens.refreshToken!);
  check("ردیفِ قبلی باطل شد", old1?.revoked_at !== null);
  check("rotated_to به جانشین اشاره می‌کند", old1?.rotated_to === new1?.id);
  check("خانواده حفظ شد", old1?.family_id === new1?.family_id);
  check(
    "مهلت تمدید نشد",
    old1?.expires_at === new1?.expires_at,
    `${old1?.expires_at}`,
  );
  check(
    "created_at به ارث رسید",
    old1?.created_at === new1?.created_at,
  );

  const meta = await query<{ user_agent: string; ip: string }>(
    `select user_agent, host(ip) as ip from sessions where id = $1`,
    [new1!.id],
  );
  check(
    "user_agent و ip منتقل شدند",
    meta[0].user_agent === "TestAgent/1.0" && meta[0].ip === "10.0.0.7",
    `${meta[0].user_agent} / ${meta[0].ip}`,
  );

  const active1 = await listActiveSessions(u1.id);
  check("«دستگاه‌های من» یک ردیف دارد نه دو", active1.length === 1, `${active1.length}`);

  // زنجیره ادامه پیدا می‌کند
  const r2 = await refreshSession(r1!.tokens.refreshToken!);
  check("چرخشِ دوم هم کار می‌کند", r2 !== null && !!r2.tokens.refreshToken);

  // ── ۲. استفادهٔ مجدد از توکنِ سوخته ──────────────────────────────────
  console.log("\n۲. استفادهٔ مجدد (بیرونِ پنجرهٔ مدارا)");
  const u2 = await makeUser("rot-2@test.local");
  const s2 = await createSession(u2);
  const rot2 = await refreshSession(s2.refreshToken);
  const live2 = rot2!.tokens.refreshToken!;

  // پنجرهٔ ۳۰ ثانیه‌ای را با عقب بردنِ revoked_at رد می‌کنیم — همان کاری که
  // گذشتِ زمان می‌کند، بدون sleep.
  await execute(
    `update sessions set revoked_at = now() - interval '10 minutes'
      where refresh_token_hash = $1`,
    [hashRefreshToken(s2.refreshToken)],
  );

  const beforeLive = await sessionRow(live2);
  check("جانشین قبل از حمله زنده است", beforeLive?.revoked_at === null);

  const attack = await refreshSession(s2.refreshToken);
  check("توکنِ سوخته رد شد", attack === null);

  const afterLive = await sessionRow(live2);
  check("جانشین هم باطل شد (ابطالِ خانوادگی)", afterLive?.revoked_at !== null);

  const stillWorks = await refreshSession(live2);
  check("توکنِ زندهٔ قبلی دیگر کار نمی‌کند", stillWorks === null);

  const active2 = await listActiveSessions(u2.id);
  check("هیچ سشنِ فعالی نمانده", active2.length === 0, `${active2.length}`);

  // ── ۳. مسابقهٔ بی‌ضرر (داخلِ پنجره) ─────────────────────────────────
  console.log("\n۳. مسابقهٔ دو تبِ همزمان");
  const u3 = await makeUser("rot-3@test.local");
  const s3 = await createSession(u3);
  const tabA = await refreshSession(s3.refreshToken);
  check("تبِ اول چرخاند", !!tabA?.tokens.refreshToken);

  // تبِ دوم با همان کوکیِ قدیمی می‌رسد — چند صدم ثانیه بعد.
  const tabB = await refreshSession(s3.refreshToken);
  check("تبِ دوم بیرون انداخته نشد", tabB !== null);
  check(
    "به تبِ دوم توکنِ refresh داده نشد (کوکی دست نخورد)",
    tabB?.tokens.refreshToken === undefined,
  );
  check("تبِ دوم توکنِ دسترسی گرفت", !!tabB?.tokens.accessToken);

  const heir3 = await sessionRow(tabA!.tokens.refreshToken!);
  check("سشنِ جانشین دست‌نخورده ماند", heir3?.revoked_at === null);
  check(
    "توکنِ تبِ اول هنوز کار می‌کند",
    (await refreshSession(tabA!.tokens.refreshToken!)) !== null,
  );

  // ── ۴. خروجِ معمولی ≠ حمله ──────────────────────────────────────────
  console.log("\n۴. خروجِ معمولی");
  const u4 = await makeUser("rot-4@test.local");
  const deviceA = await createSession(u4, { userAgent: "لپ‌تاپ" });
  const deviceB = await createSession(u4, { userAgent: "موبایل" });
  check("دو دستگاه فعال", (await listActiveSessions(u4.id)).length === 2);

  await revokeSessionByToken(deviceA.refreshToken);
  const afterLogout = await refreshSession(deviceA.refreshToken);
  check("دستگاهِ خارج‌شده رد شد", afterLogout === null);

  const remaining = await listActiveSessions(u4.id);
  check(
    "دستگاهِ دیگر بیرون انداخته نشد",
    remaining.length === 1 && remaining[0].userAgent === "موبایل",
    `${remaining.length} ردیف`,
  );
  check(
    "و هنوز می‌تواند تازه‌سازی کند",
    (await refreshSession(deviceB.refreshToken)) !== null,
  );

  // دوباره فرستادنِ توکنِ خارج‌شده هم نباید خانواده را ببرد (چون rotated_to
  // ندارد) — این همان چیزی است که خروج را از حمله جدا می‌کند.
  await refreshSession(deviceA.refreshToken);
  check(
    "تکرارِ توکنِ خارج‌شده هم دستگاهِ دیگر را نمی‌برد",
    (await listActiveSessions(u4.id)).length === 1,
  );

  // ── ۵. توکنِ ناشناخته و منقضی ───────────────────────────────────────
  console.log("\n۵. حالت‌های مرزی");
  check("توکنِ ناشناخته رد شد", (await refreshSession("این-توکن-وجود-ندارد")) === null);

  const u5 = await makeUser("rot-5@test.local");
  const s5 = await createSession(u5);
  await execute(
    `update sessions set expires_at = now() - interval '1 day'
      where refresh_token_hash = $1`,
    [hashRefreshToken(s5.refreshToken)],
  );
  check("توکنِ منقضی رد شد", (await refreshSession(s5.refreshToken)) === null);

  const u6 = await makeUser("rot-6@test.local");
  const s6 = await createSession(u6);
  await execute("update users set is_banned = true where id = $1", [u6.id]);
  check("کاربرِ مسدود رد شد", (await refreshSession(s6.refreshToken)) === null);
  const s6row = await sessionRow(s6.refreshToken);
  check("و سشنش نچرخید", s6row?.rotated_to === null);

  // ── ۶. چرخشِ همزمانِ واقعی ──────────────────────────────────────────
  console.log("\n۶. ده درخواستِ همزمان با یک توکن");
  const u7 = await makeUser("rot-7@test.local");
  const s7 = await createSession(u7);
  const results = await Promise.all(
    Array.from({ length: 10 }, () => refreshSession(s7.refreshToken)),
  );
  const ok = results.filter((r) => r !== null);
  const withToken = results.filter((r) => r?.tokens.refreshToken);
  check("هیچ درخواستی بیرون انداخته نشد", ok.length === 10, `${ok.length}/10`);
  check("دقیقاً یکی توکنِ تازه گرفت", withToken.length === 1, `${withToken.length}`);
  const active7 = await listActiveSessions(u7.id);
  check("فقط یک سشنِ زنده ساخته شد", active7.length === 1, `${active7.length}`);

  await execute("delete from users where email like 'rot-%@test.local'");

  console.log(`\n${pass} قبول، ${fail} رد`);
  await getPool().end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await getPool().end();
  process.exit(1);
});
