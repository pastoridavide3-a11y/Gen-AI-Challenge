import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ScoreRingProps = {
  /** 0–100, or null when no analysis exists yet. */
  value: number | null;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke width of the ring in px. */
  stroke?: number;
  /** Suffix shown under the number (e.g. "/100"). */
  suffix?: string;
  /** Optional caption rendered below the value. */
  label?: string;
  className?: string;
};

const RING_DURATION = 900; // ms — arc sweep and number count-up run in lockstep.

// Drives the count-up: ramps `display` from 0 to `target` over RING_DURATION with
// an ease-out curve, and flips `armed` so the SVG arc transitions from empty to
// full. Re-runs whenever the target changes (e.g. switching profiles), so the
// gauge re-draws to confirm the new value. Honours prefers-reduced-motion by
// jumping straight to the final state.
function useScoreReveal(target: number | null) {
  const [display, setDisplay] = useState(0);
  const [armed, setArmed] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) {
      setDisplay(0);
      setArmed(false);
      return;
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      setArmed(true);
      return;
    }

    setDisplay(0);
    setArmed(false);
    // Arm on the next frame so the arc has an empty starting state to grow from.
    const arm = requestAnimationFrame(() => setArmed(true));

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / RING_DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(arm);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target]);

  return { display, armed };
}

// A compact circular gauge for career / CV scores. SVG-only (no chart lib), so it
// stays crisp at any size and sweeps its arc + counts the number up on mount.
// Colour follows the score band so a glance communicates "good vs. work to do",
// all within the app's teal-forward palette.
export function ScoreRing({
  value,
  size = 132,
  stroke = 10,
  suffix = "/100",
  label,
  className,
}: ScoreRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const { display, armed } = useScoreReveal(value);
  // Empty until armed, then transitions to the target fill.
  const offset = armed ? circumference - (pct / 100) * circumference : circumference;

  const tone =
    value == null
      ? "var(--muted-foreground)"
      : pct >= 75
        ? "var(--success)"
        : pct >= 50
          ? "var(--primary)"
          : "var(--warning)";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-[900ms] ease-out-expo"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {value == null ? "—" : display}
          </span>
          {value != null && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
        {label && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
