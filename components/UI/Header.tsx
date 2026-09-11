"use client";

import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Activity, BookOpen, ChevronDown, FileText, Gamepad2, MessageSquare, Music2, UserRound } from "lucide-react";
import { useCurrentUser, usePlusSummary } from "@/lib/auth/use-current-user";
import MainLogo from "../svgs/mainLogo";
import DarkModeButton from "./DarkModeButton";
import PaletteButton from "./PaletteButton";
import PlusBadge from "./PlusBadge";
import SarvaStar from "./SarvaStar";
import styles from "./header.module.css";

const learningLinks = [
  { title: "آزمون‌ها", href: "/exam", icon: FileText },
  { title: "درسنامه", href: "/doroos", icon: BookOpen },
  { title: "بازی‌ها", href: "/game", icon: Gamepad2 },
  { title: "عروض", href: "/aruz", icon: Activity },
  { title: "کلاب", href: "/sarvaclub", icon: MessageSquare },
];

export default function Header({ compact = false }: { compact?: boolean }) {
  const { user } = useCurrentUser();
  const { plus } = usePlusSummary();
  const plusHref = plus.state === "active" ? "/panel/subscription" : "/plus";
  const plusTitle = plus.state === "expired" || plus.state === "revoked" ? "تمدید پلاس" : "سروا پلاس";
  const links = [
    ...learningLinks,
    plus.state === "off"
      ? { title: "وزن‌یاب", href: "/vazn-yab", icon: Music2 }
      : { title: plusTitle, href: plusHref, icon: SarvaStar },
  ];

  return (
    <nav dir="rtl" aria-label="ناوبری اصلی" className={`container ${styles.header}`} data-compact={compact}>
      <div className={styles.brand}>
        <Link href="/" aria-label="سروا؛ صفحهٔ اصلی" className={styles.logo}>
          <span id="site-logo" className={styles.logoMark}><MainLogo /></span>
          <span className={styles.wordmark}>ســـروا</span>
        </Link>
        <span className="hidden sm:inline-flex"><PlusBadge /></span>
        <span className="inline-flex sm:hidden"><PlusBadge compact /></span>
      </div>
      <div className={styles.actions}>
        {!compact && (
          <>
            {plus.state !== "off" && <Link href={plusHref} className={styles.plusLink}>{plusTitle}</Link>}
            <Menu.Root dir="rtl" modal={false}>
              <Menu.Trigger className={styles.menuTrigger}>
                فهرست <ChevronDown size={16} aria-hidden />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Content aria-label="بخش‌های سروا" className={styles.menu} align="start" sideOffset={12} collisionPadding={16} loop>
                  {links.map(({ title, href, icon: Icon }) => (
                    <Menu.Item key={href} asChild>
                      <Link href={href} className={styles.menuItem}>
                        <span className={styles.menuIcon}><Icon size={23} strokeWidth={1.6} aria-hidden /></span>
                        <span>{title}</span>
                      </Link>
                    </Menu.Item>
                  ))}
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
            <span className={styles.divider} aria-hidden />
          </>
        )}
        <Link href={user ? "/panel/home" : "/auth"} className={styles.account} aria-label={user ? "پنل کاربری" : "ورود به سروا"}>
          {user ? <><UserRound size={20} aria-hidden /><span>{user.fullName || "پنل کاربری"}</span></> : "ورود"}
        </Link>
        <div className={styles.theme}><PaletteButton /><DarkModeButton /></div>
      </div>
    </nav>
  );
}
