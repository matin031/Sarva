import "server-only";
import { queryOne } from "@/lib/db";
import { orderNumber } from "../order-number";
import { SANDBOX_SESSION_MINUTES } from "./test-provider";

/**
 * تلاشِ پرداختی که صفحهٔ شبیه‌ساز نشان می‌دهد — فقط اگر مالِ همین کاربر باشد.
 *
 * ⚠️ قفلِ مالکیت مهم‌ترین قفلِ شبیه‌ساز است: بدونِ آن، هر کسی می‌توانست
 * شناسهٔ تلاشِ دیگری را حدس بزند و برایش توکنِ «پرداخت موفق» بسازد.
 */
export type SandboxAttempt = {
  orderId: string;
  orderNumber: string;
  planTitle: string;
  amountRials: number;
  orderStatus: string;
  /** پایانِ مهلتِ صفحهٔ بانک (ISO). */
  deadline: string;
  expired: boolean;
};

export async function loadSandboxAttempt(
  providerRef: string,
  userId: string,
): Promise<SandboxAttempt | null> {
  if (!/^test_[0-9a-f]{32}$/.test(providerRef)) return null;

  const row = await queryOne<{
    order_id: string;
    order_seq: number;
    plan_title: string;
    amount_rials: number;
    status: string;
    redirected_at: string | null;
    created_at: string;
  }>(
    `select o.id as order_id, o.order_seq, o.plan_title, a.amount_rials, o.status,
            a.redirected_at, a.created_at
       from plus_payment_attempts a
       join plus_orders o on o.id = a.order_id
      where a.provider = 'test' and a.provider_ref = ? and o.user_id = ?`,
    [providerRef, userId],
  );
  if (!row) return null;

  const started = new Date(row.redirected_at ?? row.created_at).getTime();
  const deadline = started + SANDBOX_SESSION_MINUTES * 60_000;

  return {
    orderId: row.order_id,
    orderNumber: orderNumber(row.order_seq),
    planTitle: row.plan_title,
    amountRials: row.amount_rials,
    orderStatus: row.status,
    deadline: new Date(deadline).toISOString(),
    expired: Date.now() > deadline,
  };
}
