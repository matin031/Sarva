import type { Metadata } from "next";
import {
  adminAuditActions,
  adminAuditActors,
  adminListAudit,
  adminListErrors,
} from "@/lib/admin/log-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import ActivityPanel from "@/components/admin/ActivityPanel";

export const metadata: Metadata = {
  title: "فعالیت و خطاها",
  robots: { index: false, follow: false },
};

// این صفحه همیشه باید تازه‌ترین وضعیت را نشان بدهد؛ یک لاگِ کش‌شده یعنی
// خطایی که همین الان رخ داده دیده نمی‌شود.
export const dynamic = "force-dynamic";

async function load() {
  const [audit, errors, actors, actions] = await Promise.all([
    adminListAudit(),
    adminListErrors(),
    adminAuditActors(),
    adminAuditActions(),
  ]);
  return { audit, errors, actors, actions };
}

export default async function Page() {
  const result = await loadAdminData(load);
  if (!result.ok) return <AdminAccessDenied message={result.message} />;

  return (
    <ActivityPanel
      initialAudit={result.data.audit}
      initialErrors={result.data.errors}
      actors={result.data.actors}
      actions={result.data.actions}
    />
  );
}
