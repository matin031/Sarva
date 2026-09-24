import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withRoute } from "@/lib/api/route";
import { paymentProviderName } from "@/lib/plus/config";
import {
  buildSandboxToken,
  recordSandboxOutcome,
  testGatewayAllowedFor,
  type SandboxOutcome,
} from "@/lib/plus/payments";
import { loadSandboxAttempt } from "@/lib/plus/payments/sandbox";

/**
 * POST /payment/sandbox/submit — «بانک» نتیجه را ثبت می‌کند و کاربر را برمی‌گرداند.
 *
 * چهار انتخاب:
 *   • paid      — پرداخت موفق، بازگشت با توکنِ امضاشده.
 *   • failed    — بانک رد کرد.
 *   • cancelled — کاربر انصراف داد (یا مهلت تمام شد).
 *   • lost      — پول کم شد ولی کاربر هرگز به سایت برنگشت. نتیجه فقط در
 *                 دفترِ بانک ثبت می‌شود و کاربر مستقیم به فاکتورش می‌رود؛
 *                 آنجا «بررسی دوباره» (یا بررسیِ خودکار) باید پیدایش کند.
 *
 * ⚠️ همان قفل‌های صفحهٔ شبیه‌ساز اینجا دوباره بررسی می‌شوند: این یک endpoint
 * است و هر کسی می‌تواند مستقیم صدایش بزند. و چون کوکیِ نشست `SameSite=Lax`
 * است، POSTِ یک سایتِ دیگر اصلاً کاربرِ واردشده‌ای با خودش نمی‌آورد.
 *
 * ⚠️ مهلت: بعد از پایانِ مهلت، بانک هر انتخابی را «لغو» ثبت می‌کند.
 */
const ACTIONS = ["paid", "failed", "cancelled", "lost"] as const;
type Action = (typeof ACTIONS)[number];

export const POST = withRoute("/payment/sandbox/submit", async (request: NextRequest) => {
  const origin = request.nextUrl.origin;
  const seeOther = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  if ((await paymentProviderName()) !== "test") return seeOther("/panel/billing");

  const user = await getCurrentUser();
  if (!user) return seeOther("/auth?returnTo=/panel/billing");
  if (!testGatewayAllowedFor(user.role)) return seeOther("/panel/billing");

  const form = await request.formData().catch(() => null);
  const ref = String(form?.get("ref") ?? "");
  const rawAction = String(form?.get("action") ?? "");
  const action: Action = (ACTIONS as readonly string[]).includes(rawAction)
    ? (rawAction as Action)
    : "cancelled";

  const attempt = await loadSandboxAttempt(ref, user.id);
  if (!attempt) return seeOther("/panel/billing");

  const wanted: SandboxOutcome = attempt.expired
    ? "cancelled"
    : action === "lost"
      ? "paid"
      : action;
  const outcome = recordSandboxOutcome(ref, wanted);

  if (action === "lost" && !attempt.expired) {
    return seeOther(`/panel/billing/${attempt.orderId}`);
  }

  const back = new URLSearchParams({
    order: attempt.orderId,
    ref,
    token: buildSandboxToken(ref, outcome),
  });
  return seeOther(`/payment/return?${back.toString()}`);
});

export const dynamic = "force-dynamic";
