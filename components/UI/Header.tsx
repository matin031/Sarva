"use client";

import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Activity, BookOpen, ChevronDown, FileText, Gamepad2, History, MessageSquare, Music2 } from "lucide-react";
import { usePlusSummary } from "@/lib/auth/use-current-user";
import MainLogo from "../svgs/mainLogo";
import AccountMenu from "./AccountMenu";
import DarkModeButton from "./DarkModeButton";
import PaletteButton from "./PaletteButton";
import SarvaStar from "./SarvaStar";
import styles from "./header.module.css";

const learningLinks = [
  { title: "آزمون‌ها", href: "/exam", icon: FileText },
  { title: "درسنامه", href: "/doroos", icon: BookOpen },
  { title: "بازی‌ها", href: "/game", icon: Gamepad2 },
  { title: "عروض", href: "/aruz", icon: Activity },
  { title: "وزن‌یاب", href: "/vazn-yab", icon: Music2 },
  { title: "خط زمان", href: "/timeline", icon: History },
  { title: "کلاب", href: "/sarvaclub", icon: MessageSquare },
];

/** ستارهٔ چهارپرِ کنارِ «پلاس». */
function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={styles.sparkle}>
      <path d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5C11.5 16.9 7.1 12.5 1.5 12 7.1 11.5 11.5 7.1 12 1.5Z" />
    </svg>
  );
}

export default function Header({ compact = false, previewPlus = false }: { compact?: boolean; previewPlus?: boolean }) {
  const { plus, loading } = usePlusSummary();
  // Only the development showcase may display Plus without a database connection.
  const plusVisible = plus.state !== "off" || (process.env.NODE_ENV === "development" && previewPlus);
  const plusActive = !loading && (plus.state === "active" || (process.env.NODE_ENV === "development" && previewPlus));
  const plusHref = plus.state === "active" ? "/panel/subscription" : "/plus";
  const plusTitle = plus.state === "expired" || plus.state === "revoked" ? "تمدید پلاس" : "سروا پلاس";
  const links = plusVisible ? [...learningLinks, { title: plusTitle, href: plusHref, icon: SarvaStar }] : learningLinks;

  return (
    <nav dir="rtl" aria-label="ناوبری اصلی" className={`container ${styles.header}`} data-compact={compact}>
      <div className={styles.brand}>
        <Link href="/" aria-label="سروا؛ صفحهٔ اصلی" className={styles.logo}>
          <span id="site-logo" className={styles.logoMark}><MainLogo /></span>
          <span className={styles.wordmark}>ســـروا</span>
        </Link>
        {/* ⚠️ فقط اشتراکِ فعالِ واقعی (از `/me`) این نشان را می‌سازد. */}
        {plusActive && (
          <Link href="/panel/subscription" className={styles.plusMark} aria-label="سروا پلاس فعال است" title="سروا پلاس فعال است">
            <Sparkle />
            <span>پلاس</span>
          </Link>
        )}
      </div>
      <div className={styles.actions}>
        {!compact && (
          <>
            {plusVisible && !plusActive && <Link href={plusHref} className={styles.plusLink}>{plusTitle}</Link>}
            <Menu.Root dir="rtl" modal={false}>
              <Menu.Trigger className={styles.menuTrigger}>
                فهرست <ChevronDown size={16} aria-hidden />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Content aria-label="بخش‌های سروا" className={`${styles.menu} glass-pop`} align="start" sideOffset={12} collisionPadding={16} loop>
                  {links.map(({ title, href, icon: Icon }) => (
                    <Menu.Item key={href} asChild>
                      <Link href={href} className={styles.menuItem} data-plus={Icon === SarvaStar || undefined}>
                        <span className={styles.menuIcon}><Icon size={22} strokeWidth={1.6} aria-hidden /></span>
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
        <AccountMenu />
        <div className={styles.theme}><PaletteButton /><DarkModeButton /></div>
      </div>
    </nav>
  );
}
