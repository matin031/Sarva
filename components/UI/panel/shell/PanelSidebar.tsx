"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { ChevronsUpDown, LogOut, Settings, Sparkles } from "lucide-react";
import { apiPost } from "@/lib/api/client";
import { clearCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/UI/kit/dropdown-menu";
import PanelNav from "./PanelNav";
import styles from "../panel-design.module.css";

/** دو حرفِ اولِ نام برای آواتار — «مهدی کریمی» → «م‌ک». */
function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}‌${parts[1][0]}`;
}

/** درونِ سایدبار و کشوی موبایل، یکی است. */
export function PanelSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link
        href="/"
        onClick={onNavigate}
        className={`flex items-center gap-3 ${styles.brand}`}
      >
        <span className={`grid shrink-0 place-items-center text-[25px] font-extrabold ${styles.brandMark}`}>
          س
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] font-bold">سروا</span>
          <span className="block text-[12px] text-muted-foreground">ادبیات، قدم‌به‌قدم</span>
        </span>
      </Link>

      <div className={`mt-5 min-h-0 flex-1 overflow-y-auto ${styles.navScroll}`}>
        <PanelNav onNavigate={onNavigate} />
      </div>

      <PanelUserMenu onNavigate={onNavigate} />
    </>
  );
}

function PanelUserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useCurrentUser();
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();

  /* ⚠️ همان منطقِ ExitPanelBtn، فقط جایش عوض شده. خروج از یک صفحهٔ
     تنظیمات به منوی کاربر منتقل شد، چون کاربری که می‌خواهد خارج شود
     نباید اول به تنظیمات برود. */
  const logout = async () => {
    setLeaving(true);
    await apiPost("/api/v1/auth/logout");
    clearCurrentUser();
    router.push("/");
    router.refresh();
    toast.success("از حسابت خارج شدی", { className: "glass-toast" });
    setLeaving(false);
  };

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={leaving}
          className="flex w-full items-center gap-3 rounded-2xl p-2 text-start transition-colors hover:bg-foreground/6 disabled:opacity-60"
        >
          <span className="grid size-9.5 shrink-0 place-items-center rounded-full bg-lapis-light/20 text-[13px] font-bold">
            {initials(user?.fullName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{user?.fullName ?? "کاربر سروا"}</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {user?.email ?? "—"}
            </span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" side="top" className="w-[15rem]">
          <DropdownMenuLabel>{user?.fullName ?? "حساب من"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/panel/setting" onClick={onNavigate}>
              <Settings aria-hidden />
              تنظیمات حساب
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/panel/subscription" onClick={onNavigate}>
              <Sparkles aria-hidden />
              اشتراک سروا پلاس
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={logout}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive"
          >
            <LogOut aria-hidden />
            {leaving ? "در حال خروج…" : "خروج از حساب"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** ستونِ ثابتِ سمتِ راست — از `lg` به بالا. */
export default function PanelSidebar() {
  return (
    <aside className={`sticky hidden shrink-0 flex-col p-4 backdrop-blur-md lg:flex ${styles.sidebar}`}>
      <PanelSidebarBody />
    </aside>
  );
}
