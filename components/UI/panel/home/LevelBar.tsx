import styles from "../panel-design.module.css";
import { fa } from "@/lib/panel/format";
import type { Level } from "@/lib/panel/derive";

/** نوارِ سطح در سرصفحهٔ خانه. پر شدنش فقط CSS است، پس کامپوننت سروری می‌ماند. */
export default function LevelBar({ level, total }: { level: Level; total: number }) {
  const percent = Math.round(level.progress * 100);
  return (
    <div className={styles.level}>
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="font-semibold">
          <span className={styles.levelChip}>سطح {fa(level.level)}</span> {level.name}
        </span>
        <span className="panel-num text-muted-foreground">
          {level.nextName ? `${fa(level.toNext)} پاسخ تا ${level.nextName}` : `${fa(total)} پاسخ`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`پیشرفت تا سطح بعد`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={styles.levelTrack}
      >
        <span className={styles.levelFill} style={{ width: `${Math.max(percent, 3)}%` }} />
      </div>
    </div>
  );
}
