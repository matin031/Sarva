import styles from "./panel-design.module.css";

/** A small, code-native sprout: decorative, lightweight and theme independent. */
export default function SarvaBuddy({ small = false }: { small?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 160" fill="none" className={`${styles.buddy} ${small ? styles.buddySmall : ""}`}>
      <ellipse cx="80" cy="142" rx="42" ry="7" fill="currentColor" opacity=".09" />
      <path d="M79 48C52 51 42 32 47 18c22-1 35 9 32 30Z" fill="#89d7ad" stroke="#277d70" strokeWidth="3" />
      <path d="M80 49c-2-27 13-39 34-37 4 22-10 37-34 37Z" fill="#b6eab9" stroke="#277d70" strokeWidth="3" />
      <path d="M79 62V42m0 3L62 32m18 9 17-14" stroke="#277d70" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 84c-10-1-18 6-16 14m101-15c9-5 18-2 21 5" stroke="#277d70" strokeWidth="7" strokeLinecap="round" />
      <rect x="34" y="53" width="94" height="80" rx="34" fill="#c7eee0" stroke="#277d70" strokeWidth="3" />
      <path d="m56 132-5 7m53-7 5 7" stroke="#277d70" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="53" cy="96" rx="10" ry="6" fill="#efb7af" opacity=".8" />
      <ellipse cx="108" cy="96" rx="10" ry="6" fill="#efb7af" opacity=".8" />
      <path d="M62 84v7m37-7v7" stroke="#214f48" strokeWidth="5" strokeLinecap="round" />
      <path d="M74 97q7 9 14 0" stroke="#214f48" strokeWidth="3" strokeLinecap="round" />
      <path d="m126 33 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#e9c875" />
      <circle cx="26" cy="58" r="4" fill="#e9c875" />
    </svg>
  );
}
