// Timer.tsx
import { useEffect, useRef, useState } from "react";

type TimerProps = {
  duration: number;                  // ms
  state: "playing" | "paused";
  onComplete?: () => void;           // fires once when countdown hits 0
};

export default function Timer({ duration, state, onComplete }: TimerProps) {
  const [time, setTime] = useState(duration);
  const firedRef = useRef(false);    // ensure onComplete runs once per session

  // Snap to new duration (reset view & completion flag)
  useEffect(() => {
    setTime(duration);
    firedRef.current = false;
  }, [duration]);

  // Countdown when playing (wall-clock to avoid drift while backgrounded)
  useEffect(() => {
    if (state !== "playing") return;

    const endAt = Date.now() + time; // continue from current visible time
    let id: number | undefined;

    const tick = () => {
      const remaining = Math.max(0, endAt - Date.now());
      setTime(remaining);
      if (remaining === 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          onComplete?.();
        }
        if (id !== undefined) clearInterval(id);
      }
    };

    tick(); 
    id = window.setInterval(tick, 1000);
    return () => { if (id !== undefined) clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]); // do not depend on `time` to avoid re-creating interval every second

  const format = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600);
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  return <div className="text-gray-200 font-bold text-7xl">{format(time)}</div>;
}