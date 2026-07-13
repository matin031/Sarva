function Reticle({ x, y, visible }: { x: number; y: number; visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 hidden sm:block ${
        visible ? "opacity-90" : "opacity-0"
      } transition-opacity duration-200`}
      style={{ left: x, top: y }}
    >
      <svg
        width="46"
        height="46"
        viewBox="0 0 46 46"
        className="drop-shadow-[0_0_6px_rgba(0,0,0,0.6)]"
      >
        <circle
          cx="23"
          cy="23"
          r="16"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.5"
        />
        <line x1="23" y1="0" x2="23" y2="12" stroke="var(--color-gold)" strokeWidth="2" />
        <line x1="23" y1="34" x2="23" y2="46" stroke="var(--color-gold)" strokeWidth="2" />
        <line x1="0" y1="23" x2="12" y2="23" stroke="var(--color-gold)" strokeWidth="2" />
        <line x1="34" y1="23" x2="46" y2="23" stroke="var(--color-gold)" strokeWidth="2" />
        <circle cx="23" cy="23" r="1.5" fill="var(--color-gold)" />
      </svg>
    </div>
  );
}

export default Reticle;
