"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { BookMarked, CreditCard, House, LogOut, Presentation, Settings, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { apiPost } from "@/lib/api/client";
import { clearCurrentUser, useCurrentUser, usePlusSummary } from "@/lib/auth/use-current-user";
import { formatPhone } from "@/lib/auth/phone";
import SarvaStar from "./SarvaStar";
import styles from "./account-menu.module.css";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** «۱۲ روز مانده» — فقط وقتی تاریخِ پایان داریم. */
function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : null;
}

export function Avatar({ src, size }: { src: string | null; size: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={styles.face} style={{ width: size, height: size }}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- آواتارِ آپلودی، اندازهٔ ثابتِ کوچک
        <img src={src} alt="" width={size} height={size} onError={() => setBroken(true)} />
      ) : (
        <UserRound size={Math.round(size * 0.48)} strokeWidth={1.8} aria-hidden />
      )}
    </span>
  );
}

/**
 * منوی حساب در هدرِ سایت: فقط تصویرِ کاربر، و با نگه داشتنِ ماوس یا کلیک یک
 * منوی شیشه‌ای باز می‌شود.
 *
 * ⚠️ باز شدن با hover فقط برای ماوس است. روی لمس، `pointerenter` پیش از کلیک
 * می‌آید و منو را باز و بلافاصله با همان کلیک می‌بست.
 */
export default function AccountMenu() {
  const { user, loading } = useCurrentUser();
  const { plus } = usePlusSummary();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** منو با hover باز شده؛ کلیکِ بعدی روی تصویر نباید ببندَدش. */
  const byHover = useRef(false);
  /** همین pointerdown از روی تصویر بود و باید «بیرون» حساب نشود. */
  const keep = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  // تا پاسخِ `/me` نرسیده، نه «ورود» نه تصویر: کاربرِ واردشده یک لحظه دکمهٔ
  // ورود را می‌دید. جای خالی هم‌اندازهٔ دکمه است تا ردیف تکان نخورد.
  if (loading) return <span className={styles.placeholder} aria-hidden />;

  if (!user) {
    return (
      <Link href="/auth" className={styles.login}>
        ورود
      </Link>
    );
  }

  const isPlus = plus.state === "active";
  const left = isPlus ? daysLeft(plus.expiresAt) : null;
  const contact = user.email ?? formatPhone(user.phone);

  const hoverOpen = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOpen((was) => {
        if (!was) byHover.current = true;
        return true;
      });
    }, 90);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 220);
  };

  const logout = async () => {
    setLeaving(true);
    await apiPost("/api/v1/auth/logout");
    clearCurrentUser();
    router.push("/");
    router.refresh();
    toast.success("از حسابت خارج شدی", { className: "glass-toast" });
    setLeaving(false);
  };

  const items = [
    { href: "/panel/home", title: "پیشخوان", icon: House },
    { href: "/panel/bookmarks", title: "نشان‌شده‌ها", icon: BookMarked },
    { href: "/panel/subscription", title: "اشتراک و پرداخت", icon: CreditCard },
    ...(user.role === "teacher" ? [{ href: "/panel/teacher", title: "پنل دبیر", icon: Presentation }] : []),
    ...(user.role === "admin" ? [{ href: "/admin", title: "پنل مدیریت", icon: ShieldCheck }] : []),
    { href: "/panel/setting", title: "تنظیمات حساب", icon: Settings },
  ];

  return (
    <Menu.Root
      dir="rtl"
      modal={false}
      open={open}
      onOpenChange={(next) => {
        byHover.current = false;
        setOpen(next);
      }}
    >
      <Menu.Trigger
        className={styles.trigger}
        data-plus={isPlus || undefined}
        aria-label={`حساب کاربری ${user.fullName ?? ""}`.trim()}
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
        onPointerDown={(e) => {
          // منویی که با hover باز شده، با کلیکِ بعدی بسته نشود؛ کلیکِ دوم می‌بندد.
          if (e.pointerType === "mouse" && open && byHover.current) {
            e.preventDefault();
            byHover.current = false;
            keep.current = true;
          }
        }}
      >
        <Avatar src={user.avatarUrl} size={36} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className={`${styles.menu} glass-pop`}
          align="end"
          sideOffset={10}
          collisionPadding={12}
          loop
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          onPointerDownOutside={(e) => {
            if (keep.current) {
              e.preventDefault();
              keep.current = false;
            }
          }}
        >
          <div className={styles.head}>
            <Avatar src={user.avatarUrl} size={46} />
            <div className={styles.who}>
              <strong>{user.fullName || "کاربر سروا"}</strong>
              {contact && <span dir="ltr">{contact}</span>}
            </div>
          </div>

          {isPlus ? (
            <Menu.Item asChild>
              <Link href="/panel/subscription" className={styles.plus}>
                <SarvaStar size={17} aria-hidden />
                <span>سروا پلاس</span>
                {left !== null && <small>{left === 0 ? "امروز تمام می‌شود" : `${fa(left)} روز مانده`}</small>}
              </Link>
            </Menu.Item>
          ) : plus.state !== "off" ? (
            <Menu.Item asChild>
              <Link href="/plus" className={`${styles.plus} ${styles.plusOff}`}>
                <SarvaStar size={17} aria-hidden />
                <span>{plus.state === "expired" || plus.state === "revoked" ? "تمدید سروا پلاس" : "خرید سروا پلاس"}</span>
              </Link>
            </Menu.Item>
          ) : null}

          <div className={styles.list}>
            {items.map(({ href, title, icon: Icon }) => (
              <Menu.Item key={href} asChild>
                <Link href={href} className={styles.item}>
                  <Icon size={18} strokeWidth={1.7} aria-hidden />
                  {title}
                </Link>
              </Menu.Item>
            ))}
          </div>

          <Menu.Item className={styles.logout} disabled={leaving} onSelect={logout}>
            <LogOut size={17} strokeWidth={1.8} aria-hidden />
            {leaving ? "در حال خروج…" : "خروج از حساب"}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
