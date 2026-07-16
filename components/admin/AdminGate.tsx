/** Wraps an async data-loading call for an admin page: runs it, and on
 *  failure (requireAdmin() throwing, most commonly) returns a plain-
 *  language message instead of letting the page crash. Shared by every
 *  /admin/* page so "you're not an admin" always looks the same. */
export async function loadAdminData<T>(load: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    return { ok: true, data: await load() };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "برای دیدن این صفحه باید وارد حساب کاربری با نقش مدیر شوید.",
    };
  }
}

export function AdminAccessDenied({ message }: { message: string }) {
  return (
    <div dir="rtl" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-lg font-bold">دسترسی ندارید</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
