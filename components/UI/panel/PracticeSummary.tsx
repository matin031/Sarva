import { Target, BookOpen, Trophy, Flame } from "lucide-react";
import styles from "./panel-design.module.css";

const icons = [Target, BookOpen, Trophy, Flame];
const tones = ["mint", "lilac", "gold", "rose"];
export default function PracticeSummary({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <dl className={styles.practiceStats} aria-label="خلاصهٔ عملکرد">
      {items.map((item, index) => {
        const Icon = icons[index % icons.length];
        return (
          <div key={item.label} data-panel-card="" data-tone={tones[index % tones.length]} className={styles.practiceStat}>
            <span className={styles.sticker}><Icon aria-hidden className="size-5" strokeWidth={1.8} /></span>
            <dt className="mt-4 text-xs text-muted-foreground">{item.label}</dt>
            <dd className="panel-num mt-1 break-words text-2xl font-extrabold">{item.value}</dd>
            {item.hint && <dd className="mt-1 text-xs text-muted-foreground">{item.hint}</dd>}
          </div>
        );
      })}
    </dl>
  );
}
