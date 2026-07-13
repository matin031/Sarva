function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <svg width="42" height="42" viewBox="0 0 42 42" className="drop-shadow-[0_0_6px_rgba(0,0,0,0.7)]">
        <circle cx="21" cy="21" r="14" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" />
        <line x1="21" y1="0" x2="21" y2="10" stroke="var(--color-gold)" strokeWidth="2" />
        <line x1="21" y1="32" x2="21" y2="42" stroke="var(--color-gold)" strokeWidth="2" />
        <line x1="0" y1="21" x2="10" y2="21" stroke="var(--color-gold)" strokeWidth="2" />
        <line x1="32" y1="21" x2="42" y2="21" stroke="var(--color-gold)" strokeWidth="2" />
        <circle cx="21" cy="21" r="1.5" fill="var(--color-gold)" />
      </svg>
    </div>
  );
}

export default Crosshair;
