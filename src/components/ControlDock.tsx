import { Music2, Pause, Play, RotateCcw, Settings } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Timer from "./Timer";
import SettingsModal from "./SettingsModal";
import MusicModal from "./MusicModal";
import usePomodoroEngine from "../hooks/usePomodoroEngine";
import usePersistentState from "../hooks/usePersistentState";
import type { Session } from "../hooks/usePomodoroEngine";
import useNotificationCenter from "../hooks/useNotificationCenter";
import useLongPressReset from "../hooks/useLongPressReset";
import type { VideoBackground, Wallpaper } from "../types/wallpaper";

type ControlDockProps = {
  wallpapers: Wallpaper[];
  videoBackgrounds: VideoBackground[];
  background: string;
  onChangeBackground: (src: string) => void;
};

type DockCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
type Point = { x: number; y: number };
const SNAP_MARGIN = 20;
type MusicTab = "lofi" | "mix" | "upbeat";
type MusicTrack = { title: string; src: string };

const toSrc = (folder: MusicTab, fileName: string) =>
  encodeURI(`/sounds/${folder}/${fileName}`);

const MUSIC_LIBRARY: Record<MusicTab, MusicTrack[]> = {
  lofi: [
    { title: "Late at Night", src: toSrc("lofi", "Late-at-Night(chosic.com).mp3") },
    { title: "Little Wishes", src: toSrc("lofi", "Little-Wishes-chosic.com_.mp3") },
    { title: "Nocturnal Windowpane", src: toSrc("lofi", "nocturnal-windowpane.mp3") },
    { title: "Rainy Afternoon Chords", src: toSrc("lofi", "rainy-afternoon-chords.mp3") },
    { title: "Rainy Day Contemplation", src: toSrc("lofi", "rainy-day-contemplation.mp3") },
    { title: "Day Off", src: toSrc("lofi", "tokyo-music-walker-day-off-chosic.com_.mp3") },
  ],
  mix: [
    { title: "The Feeling", src: toSrc("mix", "AgusAlvarez & Luke Bergs - The Feeling (freetouse.com).mp3") },
    { title: "Last Summer", src: toSrc("mix", "Aylex - Last Summer (freetouse.com).mp3") },
    { title: "Chances", src: toSrc("mix", "Burgundy - Chances (freetouse.com).mp3") },
    { title: "Sweet Talks", src: toSrc("mix", "Limujii - Sweet Talks (freetouse.com).mp3") },
    { title: "Follow The Sun", src: toSrc("mix", "Luke Bergs & Waesto - Follow The Sun (freetouse.com).mp3") },
    { title: "Rose", src: toSrc("mix", "Lukrembo - Rose (freetouse.com).mp3") },
    { title: "Gingersweet", src: toSrc("mix", "massobeats - gingersweet (freetouse.com).mp3") },
    { title: "Enlivening", src: toSrc("mix", "Pufino - Enlivening (freetouse.com).mp3") },
    { title: "Way Back", src: toSrc("mix", "Zambolino - Way Back (freetouse.com).mp3") },
  ],
  upbeat: [
    { title: "Moonbeam Funk Parade", src: toSrc("upbeat", "moonbeam-funk-parade.mp3") },
    { title: "Neon Groove", src: toSrc("upbeat", "neon-groove.mp3") },
    { title: "Summer Drive", src: toSrc("upbeat", "summer-drive.mp3") },
    { title: "Virtual Dawnline", src: toSrc("upbeat", "virtual-dawnline.mp3") },
  ],
};

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
  videoBackgrounds,
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
  const [dockCorner, setDockCorner] = useState<DockCorner>("center");
  const [open, setOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicTab, setMusicTab] = useState<MusicTab>("lofi");
  const [selectedTrackIndexByTab, setSelectedTrackIndexByTab] = useState<Record<MusicTab, number>>({
    lofi: 0,
    mix: 0,
    upbeat: 0,
  });
  const [musicVolume, setMusicVolume] = useState(0.45);
  const [loopEnabled, setLoopEnabled] = usePersistentState<boolean>("pomodoro:musicLoop", false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [nowPlayingTitle, setNowPlayingTitle] = useState<string | null>(null);
  const [nowPlayingSrc, setNowPlayingSrc] = useState<string | null>(null);
  const [nowPlayingTab, setNowPlayingTab] = useState<MusicTab | null>(null);
  const [nowPlayingIndex, setNowPlayingIndex] = useState(0);
  const [dockPos, setDockPos] = useState<Point>({ x: SNAP_MARGIN, y: SNAP_MARGIN });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const titleModeRef = useRef(mode);
  const titleRemainingRef = useRef(remainingMs);
  const titleSyncedAtRef = useRef(Date.now());
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

  const toggleFullscreen = async () => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    if (doc.fullscreenElement) {
      try {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      } catch {
        showToast("Could not exit fullscreen");
      }
      return;
    }

    try {
      await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
    } catch {
      showToast("Fullscreen is blocked by your browser");
    }
  };

  const tracks = MUSIC_LIBRARY[musicTab];
  const currentTrackIndex = selectedTrackIndexByTab[musicTab] ?? 0;
  const currentTrack = tracks[currentTrackIndex] ?? tracks[0];

  useEffect(() => {
    const audio = new Audio();
    audio.loop = loopEnabled;
    audio.preload = "metadata";
    audio.volume = musicVolume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.loop = loopEnabled;
  }, [loopEnabled]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = musicVolume;
  }, [musicVolume]);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMusicPlaying) {
      audio.pause();
      setIsMusicPlaying(false);
      return;
    }
    const hasLoadedTrack = Boolean(nowPlayingSrc) && Boolean(audio.currentSrc);
    if (!hasLoadedTrack && currentTrack) {
      audio.src = currentTrack.src;
      audio.load();
      setNowPlayingTitle(currentTrack.title);
      setNowPlayingSrc(currentTrack.src);
      setNowPlayingTab(musicTab);
      setNowPlayingIndex(currentTrackIndex);
    }
    try {
      await audio.play();
      setIsMusicPlaying(true);
    } catch {
      showToast("Browser blocked autoplay. Press play again.");
      setIsMusicPlaying(false);
    }
  };

  const selectTrack = async (index: number) => {
    setSelectedTrackIndexByTab((prev) => ({ ...prev, [musicTab]: index }));
    setIsMusicPlaying(true);
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.src = tracks[index].src;
      audio.load();
      await audio.play();
      setIsMusicPlaying(true);
      setNowPlayingTitle(tracks[index].title);
      setNowPlayingSrc(tracks[index].src);
      setNowPlayingTab(musicTab);
      setNowPlayingIndex(index);
    } catch {
      setIsMusicPlaying(false);
      showToast("Could not play this track");
    }
  };

  const selectTrackSilently = (index: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTrack = tracks[index];
    if (!nextTrack) return;
    setSelectedTrackIndexByTab((prev) => ({ ...prev, [musicTab]: index }));
    audio.src = nextTrack.src;
    audio.load();
    audio.pause();
    setIsMusicPlaying(false);
    setNowPlayingTitle(nextTrack.title);
    setNowPlayingSrc(nextTrack.src);
    setNowPlayingTab(musicTab);
    setNowPlayingIndex(index);
  };

  const cycleTrack = (direction: 1 | -1) => {
    if (tracks.length === 0) return;
    const baseIndex = selectedTrackIndexByTab[musicTab] ?? 0;
    const nextIndex = (baseIndex + direction + tracks.length) % tracks.length;
    if (isMusicPlaying) {
      void selectTrack(nextIndex);
      return;
    }
    selectTrackSilently(nextIndex);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = async () => {
      if (loopEnabled || !isMusicPlaying || !nowPlayingTab) return;
      const tabTracks = MUSIC_LIBRARY[nowPlayingTab];
      if (!tabTracks || tabTracks.length === 0) return;
      const nextIndex = (nowPlayingIndex + 1) % tabTracks.length;
      const nextTrack = tabTracks[nextIndex];
      setSelectedTrackIndexByTab((prev) => ({ ...prev, [nowPlayingTab]: nextIndex }));
      setNowPlayingTitle(nextTrack.title);
      setNowPlayingSrc(nextTrack.src);
      setNowPlayingTab(nowPlayingTab);
      setNowPlayingIndex(nextIndex);
      audio.src = nextTrack.src;
      audio.load();
      try {
        await audio.play();
      } catch {
        setIsMusicPlaying(false);
        showToast("Could not auto-play next track");
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [isMusicPlaying, loopEnabled, nowPlayingIndex, nowPlayingTab, showToast]);

  useEffect(() => {
    titleModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    titleRemainingRef.current = remainingMs;
    titleSyncedAtRef.current = Date.now();
  }, [remainingMs]);

  useEffect(() => {
    const format = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const s = totalSec % 60;
      const m = Math.floor(totalSec / 60) % 60;
      const h = Math.floor(totalSec / 3600);
      const pad = (n: number) => String(n).padStart(2, "0");
      return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    };

    const updateTitle = () => {
      if (titleModeRef.current !== "playing") {
        document.title = "Pomodori <3";
        return;
      }
      const elapsed = Date.now() - titleSyncedAtRef.current;
      const derivedRemaining = Math.max(0, titleRemainingRef.current - elapsed);
      document.title = format(derivedRemaining);
    };

    updateTitle();
    const id = window.setInterval(updateTitle, 250);
    return () => window.clearInterval(id);
  }, []);

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

      if (event.code === "KeyS") {
        event.preventDefault();
        if (musicOpen && !open) setMusicOpen(false);
        setOpen((prev) => !prev);
        return;
      }

      if (event.code === "KeyM") {
        event.preventDefault();
        if (open && !musicOpen) setOpen(false);
        setMusicOpen((prev) => !prev);
        return;
      }

      if (event.code === "KeyP") {
        event.preventDefault();
        void toggleMusic();
        return;
      }

      if (event.code === "KeyF") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (event.code === "ArrowUp") {
        event.preventDefault();
        cycleTrack(-1);
        return;
      }

      if (event.code === "ArrowDown") {
        event.preventDefault();
        cycleTrack(1);
        return;
      }

      if (event.code !== "Space") return;
      event.preventDefault();
      void togglePlayback();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, resetToBase, musicTab, currentTrackIndex, isMusicPlaying, musicOpen, open, selectedTrackIndexByTab]);

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
    if (open || musicOpen) return;
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
    if (open || musicOpen) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }, [open, musicOpen]);

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
            open || musicOpen ? "pointer-events-none" : "pointer-events-auto"
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
            <button
              className={`p-2 rounded-full ${musicOpen ? "bg-white/20" : "bg-white/10 hover:bg-white/20"}`}
              onClick={() => setMusicOpen(true)}
              data-no-drag="true"
            >
              <Music2 className="w-6 h-6 text-white" />
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
        videoBackgrounds={videoBackgrounds}
        selectedWallpaper={background}
        onSelectWallpaper={onChangeBackground}
      />

      <MusicModal
        open={musicOpen}
        onClose={() => setMusicOpen(false)}
        tabs={["lofi", "mix", "upbeat"]}
        activeTab={musicTab}
        onChangeTab={setMusicTab}
        tracks={tracks}
        currentTrackIndex={currentTrackIndex}
        isPlaying={isMusicPlaying}
        onTogglePlay={() => {
          void toggleMusic();
        }}
        onSelectTrack={(index) => {
          void selectTrack(index);
        }}
        volume={musicVolume}
        onChangeVolume={setMusicVolume}
        nowPlayingTitle={nowPlayingTitle}
        nowPlayingSrc={nowPlayingSrc}
        loopEnabled={loopEnabled}
        onToggleLoop={() => setLoopEnabled((prev) => !prev)}
      />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
