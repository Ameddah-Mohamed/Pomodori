// ControlDock.tsx (only the relevant changes shown)
import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import Timer from "./Timer";
import SettingsModal from "./SettingsModal";

type Session = "focus" | "short" | "long";

export default function ControlDock() {
  const [focusDuration, setFocusDuration] = useState(25 * 60 * 1000);
  const [shortBreakDuration, setShortBreakDuration] = useState(5 * 60 * 1000);
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60 * 1000);

  const [session, setSession] = useState<Session>("focus");
  const [duration, setDuration] = useState(focusDuration);
  const [mode, setMode] = useState<"playing" | "paused">("paused");

  // NEW: bump this to force <Timer> to remount
  const [timerKey, setTimerKey] = useState(0);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const base =
      session === "focus"
        ? focusDuration
        : session === "short"
        ? shortBreakDuration
        : longBreakDuration;

    setDuration(base);
    setMode("paused");
    // Optional: also remount when session/base changes so the face snaps instantly
    setTimerKey((k) => k + 1);
  }, [session, focusDuration, shortBreakDuration, longBreakDuration]);

  const resetToBase = () => {
    const base =
      session === "focus"
        ? focusDuration
        : session === "short"
        ? shortBreakDuration
        : longBreakDuration;

    setDuration(base);   // may be same value — that’s ok
    setMode("paused");
    setTimerKey((k) => k + 1); // ✅ force <Timer> to remount & reset internal state
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="flex flex-col gap-6 p-6 rounded-2xl bg-white/10 backdrop-blur-xs shadow-lg">
        <div className="flex items-center gap-4">
          {/* ✅ Force remount via key */}
          <Timer key={timerKey} duration={duration} state={mode} />

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              onClick={() => setMode(mode === "playing" ? "paused" : "playing")}
              aria-label={mode === "playing" ? "Pause" : "Play"}
            >
              {mode === "playing" ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Remove the nested onClick on the icon; keep it only on the button */}
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              onClick={resetToBase}
              aria-label="Reset"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>

            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              onClick={() => setOpen(true)}
              aria-label="Open settings"
            >
              <Settings className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-2">
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
    </div>
  );
}