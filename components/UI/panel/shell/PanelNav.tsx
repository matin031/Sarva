"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PANEL_NAV } from "./nav";
import styles from "../panel-design.module.css";

/** Every destination stays visible on desktop and in the mobile drawer. */
export default function PanelNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const preview = process.env.NODE_ENV === "development" && (pathname === "/design-preview" || pathname.startsWith("/design-preview/"));
  const currentPath = preview ? pathname.replace("/design-preview", "/panel") : pathname;
  return (
    <nav className={styles.nav} aria-label="بخش‌های پنل">
      {PANEL_NAV.map((group) => (
        <div key={group.id}>
          <p className={styles.navLabel}>{group.label}</p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              // آیتمی که `href` دارد بیرونِ پنل است (مثل /plus): نه پیشوندِ
              // /panel/ می‌گیرد و نه در design-preview بازنویسی می‌شود.
              const target = item.href ?? `/panel/${item.src}`;
              const href = item.href ?? (preview ? `/design-preview/${item.src}` : target);
              const active = currentPath === target || currentPath.startsWith(`${target}/`) ||
                (preview && pathname === "/design-preview" && item.src === "home");
              const Icon = item.icon;
              return (
                <Link key={item.src} href={href} onClick={onNavigate}
                  aria-current={active ? "page" : undefined} className={styles.navLink}>
                  <span className={styles.navIcon}><Icon aria-hidden className="size-[19px]" strokeWidth={1.7} /></span>
                  <span>{item.title}</span>
                  {item.tag && <span className={styles.navTag}>{item.tag}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
