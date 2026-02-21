import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import Timer from "./Timer";
import SettingsModal from "./SettingsModal";
import usePomodoroEngine from "../hooks/usePomodoroEngine";
import type { Session } from "../hooks/usePomodoroEngine";
import useNotificationCenter from "../hooks/useNotificationCenter";
import useLongPressReset from "../hooks/useLongPressReset";
import type { Wallpaper } from "../types/wallpaper";

type ControlDockProps = {
  wallpapers: Wallpaper[];
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
    resumeEnabled,
    setResumeEnabled,
    saveDurations,
    completeCurrentSession,
    syncRemaining,
  } = usePomodoroEngine();
  const [open, setOpen] = useState(false);
  const {
    toast,
    showToast,
    ensureNotificationPermission,
    notifySessionEnd,
  } = useNotificationCenter();

  const togglePlayback = async () => {
    if (mode !== "playing") await ensureNotificationPermission();
    setMode(mode === "playing" ? "paused" : "playing");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      if (event.code === "KeyR") {
        event.preventDefault();
        resetToBase();
        return;
      }

      if (event.code !== "Space") return;
      event.preventDefault();
      void togglePlayback();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, resetToBase]);

  const handleTimerComplete = () => {
    const completedSession = completeCurrentSession();
    notifySessionEnd(completedSession);
  };

  const { ringStyle, beginHold, endHold } = useLongPressReset({
    holdMs: 900,
    onReset: () => {
      setSessionCounter(0);
      showToast("Session counter reset");
    },
  });

  // --- Persist durations on save ---
  const handleSaveSettings = ({
    focusMin,
    shortMin,
    longMin,
    resumeEnabled: nextResumeEnabled,
  }: {
    focusMin: number;
    shortMin: number;
    longMin: number;
    resumeEnabled: boolean;
  }) => {
    applySettings({
      focusMin,
      shortMin,
      longMin,
      resumeEnabled: nextResumeEnabled,
    });
    showToast("Timer settings saved");
  };

  const applySettings = ({
    focusMin,
    shortMin,
    longMin,
    resumeEnabled: nextResumeEnabled,
  }: {
    focusMin: number;
    shortMin: number;
    longMin: number;
    resumeEnabled: boolean;
  }) => {
    saveDurations({ focusMin, shortMin, longMin });
    setResumeEnabled(nextResumeEnabled);
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
            onTick={syncRemaining}
          />

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              onClick={() => {
                void togglePlayback();
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
            style={ringStyle}
            onPointerDown={beginHold}
            onPointerUp={endHold}
            onPointerCancel={endHold}
            onPointerLeave={endHold}
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
        initialResumeEnabled={resumeEnabled}
        onSave={handleSaveSettings}
        onRealtimeChange={applySettings}
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
