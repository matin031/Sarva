function HandsUpFigure() {
  return (
    <svg viewBox="0 0 120 220" fill="currentColor" className="w-full h-full">
      {/* left arm raised */}
      <path
        d="M44 68 Q18 44 10 2"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      {/* right arm raised */}
      <path
        d="M76 68 Q102 44 110 2"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      {/* head */}
      <circle cx="60" cy="34" r="22" />
      {/* torso */}
      <path d="M38 60 L82 60 L92 152 L28 152 Z" />
      {/* legs */}
      <path d="M40 152 L33 218 L50 218 L55 152 Z" />
      <path d="M80 152 L87 218 L70 218 L65 152 Z" />
    </svg>
  );
}

export default HandsUpFigure;
