import "server-only";

/** نقطهٔ ورود ماژول احراز هویت. */

export { getCurrentUser, requireUser, requireAdmin } from "./current-user";
export {
  createSession,
  refreshSession,
  revokeSessionByToken,
  revokeAllSessions,
  listActiveSessions,
  type ActiveSession,
  findUserById,
  findUserByEmail,
  toAuthUser,
  type IssuedTokens,
  type RequestMeta,
} from "./session";
export { hashPassword, verifyPassword } from "./password";
export { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken } from "./tokens";
export { accessCookie, refreshCookie, clearedCookies, ACCESS_COOKIE, REFRESH_COOKIE } from "./cookies";
export { AuthError, type AuthUser, type UserRole } from "./types";
