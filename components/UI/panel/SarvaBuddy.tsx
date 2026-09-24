import styles from "./panel-design.module.css";

/**
 * نهالِ سروا — تزئینی، سبک و بدونِ جاوااسکریپت.
 *
 * `mood` حالِ کاربر را بازتاب می‌دهد و فقط با CSS جان می‌گیرد (پلک، تکان،
 * جرقه)، پس کامپوننت سروری می‌ماند:
 *   • `happy`  — پیش‌فرض؛ پلک می‌زند.
 *   • `sleepy` — امروز هنوز تمرینی نشده: چشمِ بسته و «ز»های شناور.
 *   • `proud`  — امروز تمرین شده: جرقه‌ها چشمک می‌زنند و کمی بالا و پایین می‌رود.
 */
export default function SarvaBuddy({
  small = false,
  mood = "happy",
}: {
  small?: boolean;
  mood?: "happy" | "sleepy" | "proud";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 160"
      fill="none"
      data-mood={mood}
      className={`${styles.buddy} ${small ? styles.buddySmall : ""}`}
    >
      <ellipse cx="80" cy="142" rx="42" ry="7" fill="currentColor" opacity=".09" />
      <g className={styles.buddyBody}>
        <g className={styles.buddyLeaves}>
          <path d="M79 48C52 51 42 32 47 18c22-1 35 9 32 30Z" fill="#89d7ad" stroke="#277d70" strokeWidth="3" />
          <path d="M80 49c-2-27 13-39 34-37 4 22-10 37-34 37Z" fill="#b6eab9" stroke="#277d70" strokeWidth="3" />
          <path d="M79 62V42m0 3L62 32m18 9 17-14" stroke="#277d70" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M38 84c-10-1-18 6-16 14m101-15c9-5 18-2 21 5" stroke="#277d70" strokeWidth="7" strokeLinecap="round" />
        <rect x="34" y="53" width="94" height="80" rx="34" fill="#c7eee0" stroke="#277d70" strokeWidth="3" />
        <path d="m56 132-5 7m53-7 5 7" stroke="#277d70" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="53" cy="96" rx="10" ry="6" fill="#efb7af" opacity=".8" />
        <ellipse cx="108" cy="96" rx="10" ry="6" fill="#efb7af" opacity=".8" />
        {mood === "sleepy" ? (
          <>
            <path d="M57 88q5 4 10 0m27 0q5 4 10 0" stroke="#214f48" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="81" cy="101" rx="4" ry="3" fill="#214f48" opacity=".75" />
          </>
        ) : (
          <>
            <path className={styles.buddyEyes} d="M62 84v7m37-7v7" stroke="#214f48" strokeWidth="5" strokeLinecap="round" />
            <path d={mood === "proud" ? "M72 96q9 12 18 0Z" : "M74 97q7 9 14 0"} fill={mood === "proud" ? "#214f48" : "none"} stroke="#214f48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </g>
      {mood === "sleepy" ? (
        <g className={styles.buddyZ} fill="var(--primary)" fontWeight="700" fontFamily="inherit">
          <text x="120" y="44" fontSize="15">z</text>
          <text x="132" y="30" fontSize="11">z</text>
          <text x="141" y="19" fontSize="8">z</text>
        </g>
      ) : (
        <g className={styles.buddySparks}>
          <path d="m126 33 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#e9c875" />
          <circle cx="26" cy="58" r="4" fill="#e9c875" />
          {mood === "proud" && <path d="m20 28 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#9fd9c4" />}
        </g>
      )}
    </svg>
  );
}
