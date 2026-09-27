// Drawn marks in one grammar: flat fills, square ends, the proportions of sign arrows.
import type { EventType } from "@/lib/types";

type P = { className?: string; size?: number };

// A sign arrow pointing up. Rotate with the `turn` prop, in degrees clockwise.
export function Arrow({ className, size = 24, turn = 0 }: P & { turn?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={turn ? { transform: `rotate(${turn}deg)` } : undefined}
    >
      <path d="M12 1.5 21 12h-5.6v10.5H8.6V12H3z" fill="currentColor" />
    </svg>
  );
}

// Source types are told apart by shape as well as by words.
export function TypeMark({ type, className, size = 16 }: P & { type: EventType }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "miter" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} className={className}>
      {type === "manufacturer_communication" && <rect x="1.5" y="3.5" width="13" height="9" {...common} />}
      {type === "recall" && <path d="M8 1.5 14.5 8 8 14.5 1.5 8z" {...common} />}
      {type === "investigation" && <path d="M1.5 3h13L8 14z" {...common} />}
      {type === "complaint" && <rect x="4.5" y="1.5" width="7" height="13" {...common} />}
      {(type === "software_update" || type === "other") && <circle cx="8" cy="8" r="6.2" {...common} />}
    </svg>
  );
}
