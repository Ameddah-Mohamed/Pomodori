import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Timer from "./Timer";
import SettingsModal from "./SettingsModal";
import usePomodoroEngine from "../hooks/usePomodoroEngine";
import type { Session } from "../hooks/usePomodoroEngine";
import useNotificationCenter from "../hooks/useNotificationCenter";
import useLongPressReset from "../hooks/useLongPressReset";
import type { Wallpaper } from "../types/wallpaper";
import usePersistentState from "../hooks/usePersistentState";

type ControlDockProps = {
  wallpapers: Wallpaper[];
  background: string;
  onChangeBackground: (src: string) => void;
};

type DockCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
type Point = { x: number; y: number };
const SNAP_MARGIN = 20;

const getCornerPosition = (
  corner: DockCorner,
  width: number,
  height: number
): Point => {
  const maxX = Math.max(SNAP_MARGIN, window.innerWidth - width - SNAP_MARGIN);
  const maxY = Math.max(SNAP_MARGIN, window.innerHeight - height - SNAP_MARGIN);
  if (corner === "center") {
    return {
      x: Math.max(SNAP_MARGIN, Math.round((window.innerWidth - width) / 2)),
      y: Math.max(SNAP_MARGIN, Math.round((window.innerHeight - height) / 2)),
    };
  }
  if (corner === "top-left") return { x: SNAP_MARGIN, y: SNAP_MARGIN };
  if (corner === "top-right") return { x: maxX, y: SNAP_MARGIN };
  if (corner === "bottom-left") return { x: SNAP_MARGIN, y: maxY };
  return { x: maxX, y: maxY };
};

const nearestCorner = (point: Point, width: number, height: number): DockCorner => {
  const corners: DockCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right", "center"];
  let winner: DockCorner = corners[0];
  let best = Number.POSITIVE_INFINITY;
  for (const corner of corners) {
    const target = getCornerPosition(corner, width, height);
    const dx = target.x - point.x;
    const dy = target.y - point.y;
    const dist = dx * dx + dy * dy;
    if (dist < best) {
      best = dist;
      winner = corner;
    }
  }
  return winner;
};

const clampPoint = (point: Point, width: number, height: number): Point => {
  const maxX = Math.max(SNAP_MARGIN, window.innerWidth - width - SNAP_MARGIN);
  const maxY = Math.max(SNAP_MARGIN, window.innerHeight - height - SNAP_MARGIN);
  return {
    x: Math.min(Math.max(point.x, SNAP_MARGIN), maxX),
    y: Math.min(Math.max(point.y, SNAP_MARGIN), maxY),
  };
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
    remainingMs,
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
  const [dockCorner, setDockCorner] = usePersistentState<DockCorner>(
    "pomodoro:dockCorner",
    "bottom-left"
  );
  const [open, setOpen] = useState(false);
  const [dockPos, setDockPos] = useState<Point>({ x: SNAP_MARGIN, y: SNAP_MARGIN });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
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
    const format = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const s = totalSec % 60;
      const m = Math.floor(totalSec / 60) % 60;
      const h = Math.floor(totalSec / 3600);
      const pad = (n: number) => String(n).padStart(2, "0");
      return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    };
    document.title = mode === "playing" ? format(remainingMs) : "Pomodori <3";
  }, [mode, remainingMs]);

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

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const target = getCornerPosition(dockCorner, rect.width, rect.height);
    setDockPos(target);
  }, [dockCorner]);

  useEffect(() => {
    const handleResize = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      setDockPos((prev) => {
        if (isDragging) return clampPoint(prev, rect.width, rect.height);
        return getCornerPosition(dockCorner, rect.width, rect.height);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dockCorner, isDragging]);

  const startDockDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (open) return;
    const target = event.target as HTMLElement;
    const blocked = target.closest(
      "button, input, textarea, select, [role='checkbox'], [data-no-drag='true']"
    );
    if (blocked) return;

    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (open) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }, [open]);

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const panel = panelRef.current;
      if (!drag || !panel) return;
      if (event.pointerId !== drag.pointerId) return;
      const rect = panel.getBoundingClientRect();
      const next = clampPoint(
        { x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY },
        rect.width,
        rect.height
      );
      setDockPos(next);
    };

    const endDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      const panel = panelRef.current;
      if (!drag || !panel) return;
      if (event.pointerId !== drag.pointerId) return;
      const rect = panel.getBoundingClientRect();
      const corner = nearestCorner(dockPos, rect.width, rect.height);
      setDockCorner(corner);
      setDockPos(getCornerPosition(corner, rect.width, rect.height));
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dockPos, isDragging, setDockCorner]);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-20">
        <div
          ref={panelRef}
          onPointerDown={startDockDrag}
          className={`absolute flex flex-col gap-6 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/20 ${
            open ? "pointer-events-none" : "pointer-events-auto"
          } ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          style={{
            left: dockPos.x,
            top: dockPos.y,
            transition: isDragging
              ? "none"
              : "left 280ms cubic-bezier(0.2, 0.9, 0.2, 1), top 280ms cubic-bezier(0.2, 0.9, 0.2, 1)",
          }}
        >
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
              data-no-drag="true"
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
              data-no-drag="true"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>

            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              onClick={() => setOpen(true)}
              data-no-drag="true"
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
            data-no-drag="true"
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
              data-no-drag="true"
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
    </>
  );
}
