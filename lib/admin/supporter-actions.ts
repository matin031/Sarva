"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg, boolArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import { safeExternalUrl } from "@/lib/site/content";

/**
 * ادارهٔ فهرست حامیان.
 *
 * ⚠️ «حذف» عمداً وجود دارد ولی کارِ درست معمولاً «پنهان کردن» است: کسی که یک
 * بار حمایت کرده، سابقه‌اش نباید پاک شود. برای همین ستون is_visible هست و
 * دکمهٔ خاموش/روشن در پنل جلوتر از دکمهٔ حذف نشسته.
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

export type SupporterTier = "gold" | "silver" | "bronze" | "supporter";

export type AdminSupporter = {
  id: string;
  displayName: string;
  message: string | null;
  tier: SupporterTier;
  amountLabel: string | null;
  linkUrl: string | null;
  avatarUrl: string | null;
  isVisible: boolean;
  supportedAt: string | null;
  sortIndex: number;
  createdAt: string;
};

const TIERS = ["gold", "silver", "bronze", "supporter"] as const;

const schema = z.object({
  id: z.uuid().nullish(),
  displayName: z
    .string()
    .trim()
    .min(1, "نام حامی را بنویسید.")
    .max(80, "نام نباید بیشتر از ۸۰ نویسه باشد."),
  message: z.string().trim().max(200, "پیام نباید بیشتر از ۲۰۰ نویسه باشد.").nullish(),
  tier: z.enum(TIERS),
  amountLabel: z.string().trim().max(40, "برچسب نباید بیشتر از ۴۰ نویسه باشد.").nullish(),
  linkUrl: z.string().trim().max(500).nullish(),
  avatarUrl: z.string().trim().max(500).nullish(),
  isVisible: z.boolean(),
  /** yyyy-mm-dd یا خالی. */
  supportedAt: z.string().trim().nullish(),
  sortIndex: z.number().int().min(-10_000).max(10_000),
});

export type SupporterInput = z.infer<typeof schema>;

type Row = {
  id: string;
  display_name: string;
  message: string | null;
  tier: SupporterTier;
  amount_label: string | null;
  link_url: string | null;
  avatar_url: string | null;
  is_visible: boolean;
  supported_at: string | null;
  sort_index: number;
  created_at: string;
};

export async function supporterAdminList(): Promise<AdminSupporter[]> {
  await requireAdmin();
  const rows = await query<Row>(
    `select id, display_name, message, tier, amount_label, link_url, avatar_url,
            is_visible, supported_at::text as supported_at, sort_index, created_at
       from site_supporters
      order by sort_index, created_at desc`,
  );

  return rows.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    message: r.message,
    tier: r.tier,
    amountLabel: r.amount_label,
    linkUrl: r.link_url,
    avatarUrl: r.avatar_url,
    isVisible: r.is_visible,
    supportedAt: r.supported_at,
    sortIndex: r.sort_index,
    createdAt: r.created_at,
  }));
}

export async function supporterAdminSave(
  input: SupporterInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const data = parsed.data;

  // همان بررسیِ آدرسِ سمت عمومی — تا آدرسِ نامعتبر همین‌جا رد شود و نه اینکه
  // بعداً بی‌صدا از صفحه حذف شود.
  const linkUrl = data.linkUrl?.trim() ? safeExternalUrl(data.linkUrl) : null;
  if (data.linkUrl?.trim() && !linkUrl) {
    return { ok: false, errors: ["آدرس لینک معتبر نیست."] };
  }
  const avatarUrl = data.avatarUrl?.trim() ? safeExternalUrl(data.avatarUrl) : null;
  if (data.avatarUrl?.trim() && !avatarUrl) {
    return { ok: false, errors: ["آدرس تصویر معتبر نیست."] };
  }

  const supportedAt = data.supportedAt?.trim() || null;
  if (supportedAt && !/^\d{4}-\d{2}-\d{2}$/.test(supportedAt)) {
    return { ok: false, errors: ["تاریخ حمایت باید به شکل ۲۰۲۶-۰۳-۰۴ باشد."] };
  }

  const values = [
    data.displayName,
    data.message?.trim() || null,
    data.tier,
    data.amountLabel?.trim() || null,
    linkUrl,
    avatarUrl,
    data.isVisible,
    supportedAt,
    data.sortIndex,
  ];

  const row = data.id
    ? await queryOne<{ id: string }>(
        `update site_supporters
            set display_name = $1, message = $2, tier = $3, amount_label = $4,
                link_url = $5, avatar_url = $6, is_visible = $7,
                supported_at = $8::date, sort_index = $9
          where id = $10
        returning id`,
        [...values, uuidArg(data.id)],
      )
    : await queryOne<{ id: string }>(
        `insert into site_supporters
           (display_name, message, tier, amount_label, link_url, avatar_url,
            is_visible, supported_at, sort_index)
         values ($1, $2, $3, $4, $5, $6, $7, $8::date, $9)
       returning id`,
        values,
      );

  if (!row) return { ok: false, errors: ["این حامی پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: data.id ? "supporter.update" : "supporter.create",
    targetType: "supporter",
    targetId: row.id,
    summary: `${data.id ? "ویرایش" : "افزودن"} حامی «${data.displayName}»`,
    metadata: { tier: data.tier, visible: data.isVisible },
  });

  revalidatePath("/admin/supporters");
  return { ok: true, data: { id: row.id } };
}

export async function supporterAdminToggle(id: string, visible: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supporterId = uuidArg(id, "شناسهٔ حامی نامعتبر است.");
  const isVisible = boolArg(visible);

  const row = await queryOne<{ display_name: string }>(
    `update site_supporters set is_visible = $1 where id = $2 returning display_name`,
    [isVisible, supporterId],
  );
  if (!row) return { ok: false, errors: ["این حامی پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: "supporter.update",
    targetType: "supporter",
    targetId: supporterId,
    summary: `حامی «${row.display_name}» ${isVisible ? "نمایش داده" : "پنهان"} شد`,
    metadata: { visible: isVisible },
  });

  revalidatePath("/admin/supporters");
  return { ok: true, data: null };
}

export async function supporterAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supporterId = uuidArg(id, "شناسهٔ حامی نامعتبر است.");

  const existing = await queryOne<{ display_name: string }>(
    "select display_name from site_supporters where id = $1",
    [supporterId],
  );
  if (!existing) return { ok: false, errors: ["این حامی پیدا نشد."] };

  await execute("delete from site_supporters where id = $1", [supporterId]);

  await recordAudit({
    actor: admin,
    action: "supporter.delete",
    targetType: "supporter",
    targetId: supporterId,
    summary: `حذف حامی «${existing.display_name}»`,
  });

  revalidatePath("/admin/supporters");
  return { ok: true, data: null };
}
