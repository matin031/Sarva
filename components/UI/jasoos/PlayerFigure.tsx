function PlayerFigure() {
  return (
    <svg viewBox="0 0 80 140" fill="currentColor" className="w-full h-full">
      <circle cx="40" cy="20" r="14" />
      <path d="M22 38 L58 38 L52 90 L28 90 Z" />
      <path d="M18 42 L8 78" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M62 42 L72 78" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M28 90 L22 138 L36 138 L40 92 Z" />
      <path d="M52 90 L58 138 L44 138 L40 92 Z" />
    </svg>
  );
}

export default PlayerFigure;
