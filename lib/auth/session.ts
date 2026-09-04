import "server-only";
import { query, queryOne, execute, transaction } from "@/lib/db";
import { logger } from "@/lib/observability";
import { refreshTtlSeconds } from "./config";
import { generateRefreshToken, hashRefreshToken, signAccessToken } from "./tokens";
import type { AuthUser } from "./types";

/** ساخت، تازه‌سازی و ابطال سشن — تنها جایی که جدول sessions لمس می‌شود. */

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

export type RequestMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

const USER_COLUMNS = `id, email, full_name, role, email_verified_at, is_banned, created_at`;

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "student" | "admin";
  email_verified_at: string | null;
  is_banned: boolean;
  created_at: string;
};

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    emailVerified: row.email_verified_at !== null,
    isBanned: row.is_banned,
    createdAt: row.created_at,
  };
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const row = await queryOne<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id]);
  return row ? toAuthUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  const row = await queryOne<UserRow & { password_hash: string }>(
    `select ${USER_COLUMNS}, password_hash from users where email = $1`,
    [email],
  );
  return row ? { ...toAuthUser(row), passwordHash: row.password_hash } : null;
}

/** سشن تازه + جفت توکن. بعد از ورود موفق یا تأیید ایمیل صدا زده می‌شود. */
export async function createSession(user: AuthUser, meta: RequestMeta = {}): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();

  const row = await queryOne<{ id: string }>(
    `insert into sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, now() + make_interval(secs => $5::double precision))
     returning id`,
    [
      user.id,
      hashRefreshToken(refreshToken),
      meta.userAgent ?? null,
      // ip نامعتبر (مثلاً وقتی پشت پروکسی هدر عجیبی می‌آید) نباید ورود را
      // بشکند؛ ستون nullable است و null کاملاً قابل قبول است.
      meta.ip ?? null,
      refreshTtlSeconds(),
    ],
  );

  if (!row) throw new Error("ساخت سشن ناموفق بود.");

  const accessToken = await signAccessToken({ sub: user.id, role: user.role, sid: row.id });
  return { accessToken, refreshToken, sessionId: row.id };
}

/**
 * پنجرهٔ مدارا برای مسابقهٔ بی‌ضرر.
 *
 * دو درخواستِ همزمان (تبِ دوم، prefetchهای Next، یا صفحه‌ای که چند fetch
 * موازی می‌زند) با یک کوکی به اینجا می‌رسند. اولی توکن را می‌چرخاند؛ دومی
 * توکنی می‌فرستد که همین یک لحظه پیش سوخت. این «استفادهٔ مجدد» نیست، فقط
 * تأخیرِ شبکه است.
 *
 * چیزی که این پنجره را امن نگه می‌دارد: کوکی بین تب‌ها مشترک است. تا پاسخِ
 * اولی برسد، مرورگر توکنِ تازه را دارد و دیگر توکنِ سوخته را نمی‌فرستد. پس
 * فقط باید همان چند ثانیهٔ «در راه بودن» پوشش داده شود، نه بیشتر. مهاجمی که
 * توکنِ دزدیده را ساعت‌ها بعد امتحان می‌کند بیرونِ این پنجره است.
 */
const ROTATION_GRACE_SECONDS = 30;

/**
 * توکن دسترسیِ تازه از روی یک refresh token معتبر — با چرخشِ خودِ توکن.
 *
 * هر بار که این تابع موفق شود، توکنِ ورودی می‌سوزد و یک توکنِ تازه برمی‌گردد.
 * فراخوان **باید** کوکیِ refresh را با `tokens.refreshToken` به‌روز کند، وگرنه
 * مرورگر با توکنِ سوخته می‌ماند و در تازه‌سازیِ بعدی بیرون انداخته می‌شود.
 * (`refreshToken` فقط در مسیرِ مسابقهٔ بی‌ضرر undefined است؛ آنجا کوکیِ فعلیِ
 * مرورگر همان توکنِ درست است و نباید دست بخورد.)
 *
 * null یعنی «دوباره وارد شو»: توکن ناشناخته، منقضی، باطل‌شده با خروج، کاربر
 * مسدود، یا استفادهٔ مجدد از توکنی که قبلاً چرخیده.
 */
export async function refreshSession(rawRefreshToken: string): Promise<{
  tokens: { accessToken: string; refreshToken?: string };
  user: AuthUser;
} | null> {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const outcome = await transaction(async (tx) => {
    // ⚠️ عمداً `revoked_at is null` در شرط نیست: یک توکنِ سوخته باید *پیدا*
    // شود تا بتوانیم بشناسیمش. اگر مثل قبل فیلترش می‌کردیم، استفادهٔ مجدد از
    // «توکن ناشناخته» قابل تشخیص نبود و مهاجم بی‌سروصدا رد می‌شد.
    //
    // for update تا دو تازه‌سازیِ همزمان پشت سر هم اجرا شوند؛ وگرنه هر دو
    // ردیف را «نچرخیده» می‌بینند و دو زنجیرهٔ موازی می‌سازند.
    const session = await tx.queryOne<{
      id: string;
      user_id: string;
      family_id: string;
      rotated_to: string | null;
      revoked_at: string | null;
      expires_at: string;
      user_agent: string | null;
      ip: string | null;
      created_at: string;
      expired: boolean;
      recently_rotated: boolean;
    }>(
      `select id, user_id, family_id, rotated_to, revoked_at, expires_at,
              user_agent, host(ip) as ip, created_at,
              expires_at <= now() as expired,
              revoked_at > now() - make_interval(secs => $2::double precision)
                as recently_rotated
         from sessions
        where refresh_token_hash = $1
        for update`,
      [tokenHash, ROTATION_GRACE_SECONDS],
    );

    if (!session) return { kind: "none" as const };

    if (session.rotated_to !== null) {
      // این توکن قبلاً چرخیده. یا مسابقهٔ بی‌ضررِ چند ثانیه پیش است، یا کسی
      // نسخه‌ای از یک توکنِ مرده دارد.
      if (session.recently_rotated) {
        const heir = await tx.queryOne<{ id: string }>(
          `select id from sessions
            where id = $1 and revoked_at is null and expires_at > now()`,
          [session.rotated_to],
        );
        // جانشین زنده است → همان مسابقه. توکنِ تازه را دوباره نمی‌سازیم
        // (نمی‌توانیم؛ فقط هشش را داریم) و کوکی را هم دست نمی‌زنیم.
        if (heir) return { kind: "race" as const, userId: session.user_id, sessionId: heir.id };
      }

      // استفادهٔ مجدد. کدام‌یک کاربرِ واقعی است معلوم نیست، پس کلِ زنجیره
      // می‌رود و هر دو طرف باید دوباره وارد شوند.
      const revoked = await tx.execute(
        `update sessions set revoked_at = now()
          where family_id = $1 and revoked_at is null`,
        [session.family_id],
      );
      return {
        kind: "reuse" as const,
        userId: session.user_id,
        familyId: session.family_id,
        revoked,
      };
    }

    // باطل‌شده ولی نچرخیده = خروجِ معمولی، تغییر رمز، یا مسدود شدن. هیچ حمله‌ای
    // در کار نیست؛ فقط «دوباره وارد شو».
    if (session.revoked_at !== null || session.expired) return { kind: "none" as const };

    const userRow = await tx.queryOne<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [
      session.user_id,
    ]);
    if (!userRow) return { kind: "none" as const };

    // بن کردن باید همین‌جا اثر کند. اگر فقط در زمان ورود چک می‌شد، کاربرِ مسدود
    // تا ۳۰ روز می‌توانست سشنش را زنده نگه دارد.
    if (userRow.is_banned) return { kind: "none" as const };

    const nextRefresh = generateRefreshToken();

    // ⚠️ expires_at از ردیفِ قبلی می‌آید و تمدید نمی‌شود: خانواده همان مهلتِ
    // سی‌روزهٔ ورودِ اولیه را دارد. اگر هر چرخش مهلت را جلو می‌برد، زنجیرهٔ یک
    // مهاجمِ فعال هرگز منقضی نمی‌شد.
    //
    // created_at هم به ارث می‌رسد، وگرنه صفحهٔ «دستگاه‌های من» بعد از هر چرخش
    // می‌گفت این دستگاه همین چند دقیقه پیش وارد شده — و کاربر نمی‌توانست
    // ورودِ ناآشنا را از سشنِ همیشگیِ خودش تشخیص بدهد.
    const created = await tx.queryOne<{ id: string }>(
      `insert into sessions
         (user_id, refresh_token_hash, user_agent, ip, expires_at, family_id, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        session.user_id,
        hashRefreshToken(nextRefresh),
        session.user_agent,
        session.ip,
        session.expires_at,
        session.family_id,
        session.created_at,
      ],
    );
    if (!created) throw new Error("چرخش سشن ناموفق بود.");

    await tx.execute(
      `update sessions
          set revoked_at = now(), rotated_to = $2, last_used_at = now()
        where id = $1`,
      [session.id, created.id],
    );

    return {
      kind: "rotated" as const,
      user: toAuthUser(userRow),
      sessionId: created.id,
      refreshToken: nextRefresh,
    };
  });

  if (outcome.kind === "none") return null;

  if (outcome.kind === "reuse") {
    // ⚠️ نه خودِ توکن و نه هشش لاگ نمی‌شود؛ هش هم کلیدِ جدولِ sessions است و
    // در لاگ ارزشی جز نشتِ اطلاعات ندارد.
    logger.warn("استفادهٔ مجدد از refresh token — کل خانواده باطل شد", {
      event: "auth.refresh.reuse_detected",
      user_id: outcome.userId,
      family_id: outcome.familyId,
      revoked_sessions: outcome.revoked,
    });
    return null;
  }

  if (outcome.kind === "race") {
    const userRow = await queryOne<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [
      outcome.userId,
    ]);
    if (!userRow || userRow.is_banned) return null;
    const user = toAuthUser(userRow);
    const accessToken = await signAccessToken({
      sub: user.id,
      role: user.role,
      sid: outcome.sessionId,
    });
    // بدون refreshToken: کوکیِ مرورگر همین الان توکنِ جانشین را دارد.
    return { tokens: { accessToken }, user };
  }

  const accessToken = await signAccessToken({
    sub: outcome.user.id,
    role: outcome.user.role,
    sid: outcome.sessionId,
  });

  return {
    tokens: { accessToken, refreshToken: outcome.refreshToken },
    user: outcome.user,
  };
}

/** خروج از این دستگاه. */
export async function revokeSessionByToken(rawRefreshToken: string): Promise<void> {
  await execute(
    `update sessions set revoked_at = now()
      where refresh_token_hash = $1 and revoked_at is null`,
    [hashRefreshToken(rawRefreshToken)],
  );
}

/**
 * خروج از همهٔ دستگاه‌ها.
 *
 * بعد از تغییر رمز، بازنشانی رمز، و مسدود کردن کاربر صدا زده می‌شود — سه جایی
 * که «هرکسی که الان وارد است باید بیرون برود» معنی می‌دهد.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  return execute(
    `update sessions set revoked_at = now() where user_id = $1 and revoked_at is null`,
    [userId],
  );
}

export type ActiveSession = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  /** برای اینکه فراخوان بتواند «همین دستگاه» را تشخیص بدهد.
   *
   *  خودِ توکن هرگز اینجا نیست — فقط هشِ ذخیره‌شده، که با هشِ کوکیِ درخواستِ
   *  جاری مقایسه می‌شود. این مقدار نباید به مرورگر فرستاده شود؛ route فقط
   *  نتیجهٔ مقایسه (یک بولی) را بیرون می‌دهد. */
  refreshTokenHash: string;
};

/** سشن‌های فعال — پشتِ صفحهٔ «دستگاه‌های من» در تنظیمات حساب. */
export async function listActiveSessions(userId: string): Promise<ActiveSession[]> {
  const rows = await query<{
    id: string;
    user_agent: string | null;
    ip: string | null;
    created_at: string;
    last_used_at: string | null;
    refresh_token_hash: string;
  }>(
    `select id, user_agent, host(ip) as ip, created_at, last_used_at, refresh_token_hash
       from sessions
      where user_id = $1 and revoked_at is null and expires_at > now()
      order by coalesce(last_used_at, created_at) desc`,
    [userId],
  );

  return rows.map((r) => ({
    id: r.id,
    userAgent: r.user_agent,
    ip: r.ip,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    refreshTokenHash: r.refresh_token_hash,
  }));
}
