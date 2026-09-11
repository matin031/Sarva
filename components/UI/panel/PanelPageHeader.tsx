import type { ReactNode } from "react";
import SarvaBuddy from "./SarvaBuddy";
import styles from "./panel-design.module.css";

export default function PanelPageHeader({ title, description, eyebrow = "همراه تو در مسیر یادگیری", tone = "mint", action }: {
  title: string; description?: string; eyebrow?: string;
  tone?: "mint" | "gold" | "lilac" | "rose"; action?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader} data-tone={tone}>
      <div className="min-w-0 flex-1">
        <p className={styles.pageEyebrow}><span aria-hidden>✦</span> {eyebrow}</p>
        <h1 className="break-words text-2xl font-extrabold sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">{description}</p>}
        {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
      </div>
      <SarvaBuddy small />
    </header>
  );
}
