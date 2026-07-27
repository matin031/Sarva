import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { jalaliLong } from "@/lib/panel/format";
import AccountSettings from "@/components/UI/AccountSettings";
import ExitPanelBtn from "@/components/UI/ExitPanelBtn";
import { Card, PanelHeader } from "@/components/UI/panel/primitives";

export default async function SettingsPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  return (
    <>
      <PanelHeader
        title="تنظیمات حساب"
        subtitle="نام نمایشی و رمز عبورت را اینجا عوض کن."
      />

      <Card className="mb-4 p-5">
        <h2 className="mb-4 text-sm font-black text-foreground">
          مشخصاتِ حساب
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-3.5">
            <dt className="text-[11px] text-muted-foreground">نام نمایشی</dt>
            <dd className="mt-1 text-sm font-bold text-foreground">
              {user.fullName}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-background p-3.5">
            <dt className="text-[11px] text-muted-foreground">ایمیل</dt>
            <dd dir="ltr" className="mt-1 truncate text-sm font-bold text-foreground">
              {user.email ?? "—"}
            </dd>
          </div>
          {user.createdAt && (
            <div className="rounded-xl border border-border bg-background p-3.5 sm:col-span-2">
              <dt className="text-[11px] text-muted-foreground">
                عضو از
              </dt>
              <dd className="mt-1 text-sm font-bold text-foreground">
                {jalaliLong(user.createdAt)}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="p-5">
        <AccountSettings />
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-1 text-sm font-black text-foreground">
          خروج از حساب
        </h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          روی این دستگاه از حسابت خارج می‌شوی؛ کارنامه و پیشرفتت محفوظ می‌ماند.
        </p>
        <ExitPanelBtn />
      </Card>
    </>
  );
}
