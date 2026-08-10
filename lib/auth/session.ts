import "server-only";
import { query, queryOne, execute } from "@/lib/db";
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

type UserRow = {
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
 * توکن دسترسیِ تازه از روی یک refresh token معتبر.
 *
 * خودِ refresh token عمداً چرخانده نمی‌شود. چرخاندنش در هر بار استفاده جلوی
 * سوءاستفاده از توکنِ دزدیده‌شده را بهتر می‌گیرد، ولی یک مشکل واقعی می‌سازد:
 * دو تب که همزمان تازه‌سازی کنند، دومی توکنی می‌فرستد که همین الان باطل شده و
 * کاربر بی‌دلیل بیرون انداخته می‌شود. با httpOnly بودن کوکی و مقیاس این سایت،
 * آن معامله نمی‌ارزد.
 *
 * null یعنی «دوباره وارد شو»: توکن ناشناخته، باطل‌شده، منقضی، یا کاربر مسدود.
 */
export async function refreshSession(
  rawRefreshToken: string,
): Promise<{ tokens: Pick<IssuedTokens, "accessToken">; user: AuthUser } | null> {
  const row = await queryOne<UserRow & { session_id: string }>(
    `select u.id, u.email, u.full_name, u.role, u.email_verified_at,
            u.is_banned, u.created_at, s.id as session_id
       from sessions s
       join users u on u.id = s.user_id
      where s.refresh_token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()`,
    [hashRefreshToken(rawRefreshToken)],
  );

  if (!row) return null;

  // بن کردن باید همین‌جا اثر کند. اگر فقط در زمان ورود چک می‌شد، کاربرِ مسدود
  // تا ۳۰ روز می‌توانست سشنش را زنده نگه دارد.
  if (row.is_banned) return null;

  const user = toAuthUser(row);
  const accessToken = await signAccessToken({ sub: user.id, role: user.role, sid: row.session_id });

  // بی‌صدا شکست می‌خورد اگر نشد — «آخرین استفاده» اطلاعات جانبی است و نباید
  // بتواند یک تازه‌سازیِ درست را خراب کند.
  void execute("update sessions set last_used_at = now() where id = $1", [row.session_id]).catch(
    () => {},
  );

  return { tokens: { accessToken }, user };
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
