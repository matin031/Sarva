import type { ReactNode } from "react";

/** The panel's repeated section frame: a glass card with an icon, a title and
 *  an optional line of explanation. Every page uses the same one so the pages
 *  read as one panel rather than four. */

const ICONS: Record<string, ReactNode> = {
  chart: (
    <path
      fillRule="evenodd"
      d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Zm10.5-10.5a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z"
      clipRule="evenodd"
    />
  ),
  scale: (
    <path
      fillRule="evenodd"
      d="M12 2.25a.75.75 0 0 1 .75.75v.756a49.106 49.106 0 0 1 9.152 1 .75.75 0 0 1-.302 1.47A47.58 47.58 0 0 0 12.75 4.5v14.855a48.9 48.9 0 0 1 5.166.457.75.75 0 0 1-.166 1.49 47.4 47.4 0 0 0-11.5 0 .75.75 0 1 1-.166-1.49 48.9 48.9 0 0 1 5.166-.457V4.5c-2.7.061-5.362.362-7.95.876a.75.75 0 0 1-.302-1.47 49.106 49.106 0 0 1 9.152-1V3a.75.75 0 0 1 .75-.75Zm-6.63 6.03a.75.75 0 0 1 .676.418l3 6a.75.75 0 0 1-.235.943A4.478 4.478 0 0 1 6 16.5a4.478 4.478 0 0 1-2.811-.984.75.75 0 0 1-.235-.943l3-6a.75.75 0 0 1 .676-.418Zm12 0a.75.75 0 0 1 .676.418l3 6a.75.75 0 0 1-.235.943A4.478 4.478 0 0 1 18 16.5a4.478 4.478 0 0 1-2.811-.984.75.75 0 0 1-.235-.943l3-6a.75.75 0 0 1 .676-.418Z"
      clipRule="evenodd"
    />
  ),
  clipboard: (
    <path
      fillRule="evenodd"
      d="M9 1.5H5.625c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5Zm6.61 10.936a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 14.47a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
      clipRule="evenodd"
    />
  ),
  bookmark: (
    <path
      fillRule="evenodd"
      d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
      clipRule="evenodd"
    />
  ),
  spy: (
    <path
      fillRule="evenodd"
      d="M12 3.75a.75.75 0 0 1 .75.75v.75h4.5a2.25 2.25 0 0 1 2.16 1.62l.66 2.31a.75.75 0 0 1-.72.96h-.6a3.75 3.75 0 0 1-7.28.75h-.94a3.75 3.75 0 0 1-7.28-.75h-.6a.75.75 0 0 1-.72-.96l.66-2.31A2.25 2.25 0 0 1 6.75 5.25h4.5V4.5a.75.75 0 0 1 .75-.75Zm-6 8.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm12 0a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM3.75 15.75a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm2.25 3a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Z"
      clipRule="evenodd"
    />
  ),
  award: (
    <path
      fillRule="evenodd"
      d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25a4.49 4.49 0 0 1 3.397 1.549 4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
      clipRule="evenodd"
    />
  ),
};

export default function PanelSection({
  title,
  hint,
  icon = "chart",
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  icon?: keyof typeof ICONS | string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={` glass mt-6 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className=" flex items-center gap-x-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className={` size-8 shrink-0 sm:size-10 ${
            icon === "bookmark" ? "text-gold" : ""
          }`}
        >
          {ICONS[icon] ?? ICONS.chart}
        </svg>
        <h2 className=" text-2xl sm:text-3xl">{title}</h2>
      </div>
      {hint && (
        <p className=" mt-2 text-xs text-muted-foreground sm:text-sm">{hint}</p>
      )}
      {children}
    </section>
  );
}
