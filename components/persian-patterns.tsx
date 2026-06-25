"use client";
interface GeometricPatternProps {
  className?: string;
  opacity?: number;
}

export function GeometricPattern({
  className = "",
  opacity = 0.08,
}: GeometricPatternProps) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="persian-pattern"
          x="0"
          y="0"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          {/* Central star */}
          <path
            d="M40 10 L45 35 L70 40 L45 45 L40 70 L35 45 L10 40 L35 35 Z"
            fill="currentColor"
            opacity={opacity}
          />
          {/* Corner diamonds */}
          <path
            d="M0 0 L10 0 L0 10 Z"
            fill="currentColor"
            opacity={opacity * 0.7}
          />
          <path
            d="M80 0 L80 10 L70 0 Z"
            fill="currentColor"
            opacity={opacity * 0.7}
          />
          <path
            d="M0 80 L0 70 L10 80 Z"
            fill="currentColor"
            opacity={opacity * 0.7}
          />
          <path
            d="M80 80 L70 80 L80 70 Z"
            fill="currentColor"
            opacity={opacity * 0.7}
          />
          {/* Connecting lines */}
          <circle
            cx="40"
            cy="40"
            r="3"
            fill="currentColor"
            opacity={opacity * 0.5}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#persian-pattern)" />
    </svg>
  );
}
