import { redirect } from "next/navigation";
import Link from "next/link";
import HomePanel from "@/components/UI/panel/HomePanel";
import PlusWelcome from "@/components/UI/plus/PlusWelcome";
import { getPanelOverview, getPanelUser } from "@/lib/panel/queries";
import { getPlusStatus } from "@/lib/plus/entitlement";
import { getUnreadWelcome } from "@/lib/plus/notifications";
import { expiringSoonDays } from "@/lib/plus/config";
import { fa, jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const [overview, status] = await Promise.all([getPanelOverview(user.id), getPlusStatus()]);

  /* پیامِ خوش‌آمد فقط وقتی که واقعاً یک فعال‌سازیِ دیده‌نشده وجود دارد.
     ⚠️ اگر خواندنِ وضعیت شکست خورده باشد (`unavailable`)، هیچ پیامی نشان
     داده نمی‌شود — نه خوش‌آمد و نه هشدارِ پایان. حدس زدن در این حالت یعنی
     نشان دادنِ پیامِ اشتباه به کاربری که پول داده. */
  const welcome = status.state === "active" ? await getUnreadWelcome(user.id) : null;
  const soonDays = status.expiringSoon ? await expiringSoonDays() : 0;

  return (
    <>
      {welcome && <PlusWelcome notificationId={welcome.id} kind={welcome.kind} />}

      {/* هشدارِ آرامِ «نزدیک پایان». نه قرمز، نه چشمک‌زن: اشتراک هنوز فعال
          است و ترساندنِ کاربر بی‌جاست. */}
      {status.expiringSoon && status.expiresAt && (
        <p
          dir="rtl"
          className="mb-5 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-xs leading-relaxed plus-ink"
        >
          کمتر از {fa(soonDays)} روز تا پایان سروا پلاس ({jalaliLong(status.expiresAt)}).{" "}
          <Link href="/plus" className="underline underline-offset-4">
            تمدید
          </Link>{" "}
          — دورهٔ تازه به انتهای همین دوره اضافه می‌شود.
        </p>
      )}

      {status.state === "expired" && (
        <p
          dir="rtl"
          className="mb-5 rounded-2xl border border-border p-3 text-xs leading-relaxed text-muted-foreground"
        >
          دورهٔ سروا پلاس تو تمام شده است. هیچ‌کدام از پاسخ‌ها و کارنامه‌هایت
          پاک نشده‌اند.{" "}
          <Link href="/plus" className="text-primary underline underline-offset-4">
            تمدید سروا پلاس
          </Link>
        </p>
      )}

      <HomePanel
        name={user.fullName}
        memberSince={user.createdAt}
        overview={overview}
      />
    </>
  );
}
