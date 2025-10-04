// ControlDock.tsx
import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Timer from "./Timer";
import SettingsModal from "./SettingsModal";

type Session = "focus" | "short" | "long";

export default function ControlDock() {
  // Base durations (ms)
  const [focusDuration, setFocusDuration] = useState(25 * 60 * 1000);
  const [shortBreakDuration, setShortBreakDuration] = useState(5 * 60 * 1000);
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60 * 1000);

  // Which session is active
  const [session, setSession] = useState<Session>("focus");

  // Current countdown duration passed into Timer
  const [duration, setDuration] = useState(focusDuration);

  // Play/Pause
  const [mode, setMode] = useState<"playing" | "paused">("paused");

  // Force-remount Timer on reset/session change to clear internal state
  const [timerKey, setTimerKey] = useState(0);

  // Settings modal
  const [open, setOpen] = useState(false);

  // Session counter (increments when a focus session finishes)
  const [sessionCounter, setSessionCounter] = useState<number>(0);

  // In-app toast (top-center)
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  // Sync timer when session or base durations change
  useEffect(() => {
    const base =
      session === "focus"
        ? focusDuration
        : session === "short"
        ? shortBreakDuration
        : longBreakDuration;

    setDuration(base);
    setMode("paused");
    setTimerKey((k) => k + 1);
  }, [session, focusDuration, shortBreakDuration, longBreakDuration]);

  const resetToBase = () => {
    const base =
      session === "focus"
        ? focusDuration
        : session === "short"
        ? shortBreakDuration
        : longBreakDuration;

    setDuration(base);
    setMode("paused");
    setTimerKey((k) => k + 1); // force <Timer> to re-init from `duration`
  };

  // --- Notifications (while tab is open) ---
  async function ensureNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      const res = await Notification.requestPermission();
      return res === "granted";
    } catch {
      return false;
    }
  }

  const notifyEnd = (s: Session) => {
    const titleMap: Record<Session, string> = {
      focus: "Focus session finished",
      short: "Short break finished",
      long: "Long break finished",
    };
    const bodyMap: Record<Session, string> = {
      focus: "Time for a break!",
      short: "Back to focus 💪",
      long: "Cycle complete! 🎉",
    };

    const title = titleMap[s];
    const body = bodyMap[s];

    // OS-level toast (if allowed)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          tag: `pomodoro-${s}`, // avoid stacking dupes
          icon: "/icon-192.png", // optional assets in /public
          badge: "/badge-72.png",
        });
      } catch {
        /* ignore */
      }
    }

    // Optional: small ding (may require prior user gesture)
    try {
      const a = new Audio("/ding.mp3");
      a.play().catch(() => {});
    } catch {}

    // In-app toast as well (fallback + visual flair)
    showToast(`${title} — ${body}`);
  };

  // <Timer /> will call this exactly once when it reaches 0
  const handleTimerComplete = () => {
    setMode("paused");
    notifyEnd(session);
    if (session === "focus") setSessionCounter((prev) => prev + 1);

    // Optional auto-switch:
    // if (session === "focus") setSession("short");
    // else setSession("focus");
  };

  // --- Hold-to-reset for the session counter (no extra button) ---
  const [holdPct, setHoldPct] = useState(0); // 0 → 1 while holding
  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef(0);
  const HOLD_MS = 900;

  const beginResetHold = () => {
    if (holdRaf.current != null) return; // already running
    holdStart.current = performance.now();
    const step = (t: number) => {
      const pct = Math.min(1, (t - holdStart.current) / HOLD_MS);
      setHoldPct(pct);
      if (pct < 1) {
        holdRaf.current = requestAnimationFrame(step);
      } else {
        // completed hold → reset counter
        setSessionCounter(0);
        showToast("Session counter reset");
        // brief filled state, then clear
        setTimeout(() => setHoldPct(0), 150);
        holdRaf.current = null;
      }
    };
    holdRaf.current = requestAnimationFrame(step);
  };

  const endResetHold = () => {
    if (holdRaf.current != null) {
      cancelAnimationFrame(holdRaf.current);
      holdRaf.current = null;
    }
    if (holdPct < 1) setHoldPct(0); // if not completed, clear progress
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="flex flex-col gap-6 p-6 rounded-2xl bg-white/10 backdrop-blur-xs shadow-lg">
        <div className="flex items-center gap-4 justify-around">
          {/* key forces remount on reset/session change */}
          <Timer
            key={timerKey}
            duration={duration}
            state={mode}
            onComplete={handleTimerComplete}
          />

          <div className="flex items-center gap-2">
            {/* Play / Pause */}
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              onClick={async () => {
                if (mode !== "playing") {
                  await ensureNotificationPermission();
                }
                setMode(mode === "playing" ? "paused" : "playing");
              }}
              aria-label={mode === "playing" ? "Pause" : "Play"}
            >
              {mode === "playing" ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Reset timer */}
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              onClick={resetToBase}
              aria-label="Reset timer"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>

            {/* Settings */}
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              onClick={() => setOpen(true)}
              aria-label="Open settings"
            >
              <Settings className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Session buttons + Counter (press-and-hold to reset) */}
        <div className="flex justify-center gap-3 items-center">
          {/* Counter pill with hold-to-reset ring */}
          <div
            className="
              relative h-12 w-12 rounded-full grid place-items-center
              cursor-pointer select-none
              transition-transform active:scale-95
            "
            style={{
              background:
                holdPct > 0
                  ? `conic-gradient(rgba(255,255,255,0.9) ${holdPct * 360}deg, rgba(255,255,255,0.18) 0deg)`
                  : "rgba(255,255,255,0.12)",
              boxShadow:
                holdPct > 0
                  ? "0 10px 30px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.2)"
                  : "0 10px 30px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
            onMouseDown={beginResetHold}
            onMouseUp={endResetHold}
            onMouseLeave={endResetHold}
            onTouchStart={(e) => {
              e.preventDefault();
              beginResetHold();
            }}
            onTouchEnd={endResetHold}
            onTouchCancel={endResetHold}
            aria-label="Hold to reset session counter"
            title="Hold to reset"
          >
            <div
              className="
                h-10 w-10 rounded-full grid place-items-center
                bg-white/10 backdrop-blur-md border border-white/20
                shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
                transition-colors
              "
              style={{ opacity: holdPct > 0 ? 0.9 : 1 }}
            >
              <span className="text-white font-semibold">{sessionCounter}</span>
            </div>
            
          </div>

          {/* Session selectors */}
          <button
            className={`px-4 py-2 rounded-lg ${
              session === "focus"
                ? "bg-white/20"
                : "bg-white/10 hover:bg-white/20"
            } text-white cursor-pointer`}
            onClick={() => setSession("focus")}
          >
            Focus
          </button>

          <button
            className={`px-4 py-2 rounded-lg ${
              session === "short"
                ? "bg-white/20"
                : "bg-white/10 hover:bg-white/20"
            } text-white cursor-pointer`}
            onClick={() => setSession("short")}
          >
            Short-Break
          </button>

          <button
            className={`px-4 py-2 rounded-lg ${
              session === "long"
                ? "bg-white/20"
                : "bg-white/10 hover:bg-white/20"
            } text-white cursor-pointer`}
            onClick={() => setSession("long")}
          >
            Long-Break
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        open={open}
        onClose={() => setOpen(false)}
        initialFocusMin={focusDuration / 60000}
        initialShortMin={shortBreakDuration / 60000}
        initialLongMin={longBreakDuration / 60000}
        onSave={({ focusMin, shortMin, longMin }) => {
          setFocusDuration(focusMin * 60_000);
          setShortBreakDuration(shortMin * 60_000);
          setLongBreakDuration(longMin * 60_000);
        }}
      />

      {/* Aesthetic glass toast (TOP center), above footer */}
      {toast && (
        <div
          className="
            fixed top-6 left-1/2 -translate-x-1/2
            z-[60]
            px-4 py-2 rounded-2xl
            bg-white/10 backdrop-blur-md border border-white/20
            text-white shadow-lg
          "
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}