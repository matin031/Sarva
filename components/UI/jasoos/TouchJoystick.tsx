"use client";
import { useCallback, useRef, useState } from "react";

const RADIUS = 44;

function TouchJoystick({
  vectorRef,
  label,
}: {
  vectorRef: React.RefObject<{ x: number; y: number }>;
  label: string;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const updateFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }
      setStickPos({ x: dx, y: dy });
      vectorRef.current = { x: dx / RADIUS, y: -dy / RADIUS };
    },
    [vectorRef],
  );

  const reset = useCallback(() => {
    setStickPos({ x: 0, y: 0 });
    vectorRef.current = { x: 0, y: 0 };
    activePointer.current = null;
  }, [vectorRef]);

  return (
    <div
      ref={baseRef}
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointer.current = e.pointerId;
        updateFromClient(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activePointer.current !== e.pointerId) return;
        updateFromClient(e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      className="relative size-28 rounded-full bg-black/35 border border-white/20 touch-none select-none pointer-events-auto"
    >
      <div
        className="absolute size-12 rounded-full bg-gold/70 border border-gold"
        style={{
          left: `calc(50% + ${stickPos.x}px - 24px)`,
          top: `calc(50% + ${stickPos.y}px - 24px)`,
        }}
      />
    </div>
  );
}

export default TouchJoystick;
