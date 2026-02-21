import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { useRef, useState } from "react";
import Timer from "./Timer";
import SettingsModal from "./SettingsModal";
import usePomodoroEngine from "../hooks/usePomodoroEngine";
import type { Session } from "../hooks/usePomodoroEngine";

type ControlDockProps = {
  wallpapers: string[];
  background: string;
  onChangeBackground: (src: string) => void;
};

export default function ControlDock({
  wallpapers,
  background,
  onChangeBackground,
}: ControlDockProps) {
  const {
    session,
    setSession,
    mode,
    setMode,
    timerKey,
    duration,
    sessionCounter,
    setSessionCounter,
    resetToBase,
    durationsMin,
    saveDurations,
    completeCurrentSession,
  } = usePomodoroEngine();
  const [open, setOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  // Notifications and sound
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
    const titles: Record<Session, string> = {
      focus: "Focus session finished",
      short: "Short break finished",
      long: "Long break finished",
    };
    const bodies: Record<Session, string> = {
      focus: "Time for a break!",
      short: "Back to focus 💪",
      long: "Cycle complete! 🎉",
    };

    const title = titles[s];
    const body = bodies[s];

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }

    try {
      new Audio("/ding.mp3").play();
    } catch {}

    showToast(`${title} — ${body}`);
  };

  const handleTimerComplete = () => {
    const completedSession = completeCurrentSession();
    notifyEnd(completedSession);
  };

  // --- Hold-to-reset session counter ---
  const [holdPct, setHoldPct] = useState(0);
  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef(0);
  const HOLD_MS = 900;

  const beginResetHold = () => {
    if (holdRaf.current != null) return;
    holdStart.current = performance.now();
    const step = (t: number) => {
      const pct = Math.min(1, (t - holdStart.current) / HOLD_MS);
      setHoldPct(pct);
      if (pct < 1) holdRaf.current = requestAnimationFrame(step);
      else {
        setSessionCounter(0);
        showToast("Session counter reset");
        setTimeout(() => setHoldPct(0), 150);
        holdRaf.current = null;
      }
    };
    holdRaf.current = requestAnimationFrame(step);
  };

  const endResetHold = () => {
    if (holdRaf.current != null) cancelAnimationFrame(holdRaf.current);
    holdRaf.current = null;
    if (holdPct < 1) setHoldPct(0);
  };

  // --- Persist durations on save ---
  const handleSaveSettings = ({
    focusMin,
    shortMin,
    longMin,
  }: {
    focusMin: number;
    shortMin: number;
    longMin: number;
  }) => {
    saveDurations({ focusMin, shortMin, longMin });
    showToast("Timer settings saved");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="flex flex-col gap-6 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/20">
        <div className="flex items-center gap-4 justify-around">
          <Timer
            key={timerKey}
            duration={duration}
            state={mode}
            onComplete={handleTimerComplete}
          />

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              onClick={async () => {
                if (mode !== "playing") await ensureNotificationPermission();
                setMode(mode === "playing" ? "paused" : "playing");
              }}
            >
              {mode === "playing" ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              onClick={resetToBase}
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>

            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              onClick={() => setOpen(true)}
            >
              <Settings className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-3 items-center">
          {/* Session Counter */}
          <div
            className="relative h-12 w-12 rounded-full grid place-items-center cursor-pointer"
            style={{
              background:
                holdPct > 0
                  ? `conic-gradient(rgba(255,255,255,0.9) ${
                      holdPct * 360
                    }deg, rgba(255,255,255,0.18) 0deg)`
                  : "rgba(255,255,255,0.12)",
            }}
            onMouseDown={beginResetHold}
            onMouseUp={endResetHold}
            onMouseLeave={endResetHold}
          >
            <div className="h-10 w-10 rounded-full grid place-items-center bg-white/10 backdrop-blur-md border border-white/20">
              <span className="text-white font-semibold">{sessionCounter}</span>
            </div>
          </div>

          {/* Session selectors */}
          {(["focus", "short", "long"] as Session[]).map((s) => (
            <button
              key={s}
              className={`px-4 py-2 rounded-lg ${
                session === s ? "bg-white/20" : "bg-white/10 hover:bg-white/20"
              } text-white`}
              onClick={() => setSession(s)}
            >
              {s === "focus"
                ? "Focus"
                : s === "short"
                ? "Short-Break"
                : "Long-Break"}
            </button>
          ))}
        </div>
      </div>

      <SettingsModal
        open={open}
        onClose={() => setOpen(false)}
        initialFocusMin={durationsMin.focusMin}
        initialShortMin={durationsMin.shortMin}
        initialLongMin={durationsMin.longMin}
        onSave={handleSaveSettings}
        wallpapers={wallpapers}
        selectedWallpaper={background}
        onSelectWallpaper={onChangeBackground}
      />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
