import { useEffect, useMemo, useRef, useState } from "react";

type UseLongPressResetParams = {
  holdMs?: number;
  onReset: () => void;
};

export default function useLongPressReset({
  holdMs = 900,
  onReset,
}: UseLongPressResetParams) {
  const [holdPct, setHoldPct] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const beginHold = () => {
    if (rafRef.current != null) return;
    startRef.current = performance.now();

    const step = (now: number) => {
      const pct = Math.min(1, (now - startRef.current) / holdMs);
      setHoldPct(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      onReset();
      window.setTimeout(() => setHoldPct(0), 150);
      rafRef.current = null;
    };

    rafRef.current = requestAnimationFrame(step);
  };

  const endHold = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (holdPct < 1) setHoldPct(0);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const ringStyle = useMemo(
    () => ({
      background:
        holdPct > 0
          ? `conic-gradient(rgba(255,255,255,0.9) ${
              holdPct * 360
            }deg, rgba(255,255,255,0.18) 0deg)`
          : "rgba(255,255,255,0.12)",
      touchAction: "none" as const,
    }),
    [holdPct]
  );

  return {
    holdPct,
    ringStyle,
    beginHold,
    endHold,
  };
}
