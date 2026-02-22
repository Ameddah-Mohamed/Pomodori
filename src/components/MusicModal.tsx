import { useEffect, useState } from "react";

type MusicTab = "lofi" | "mix" | "upbeat";
type MusicTrack = { title: string; src: string };

type MusicModalProps = {
  open: boolean;
  onClose: () => void;
  tabs: MusicTab[];
  activeTab: MusicTab;
  onChangeTab: (tab: MusicTab) => void;
  tracks: MusicTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectTrack: (index: number) => void;
  volume: number;
  onChangeVolume: (value: number) => void;
  nowPlayingTitle: string | null;
  nowPlayingSrc: string | null;
  loopEnabled: boolean;
  onToggleLoop: () => void;
};

export default function MusicModal({
  open,
  onClose,
  tabs,
  activeTab,
  onChangeTab,
  tracks,
  currentTrackIndex,
  isPlaying,
  onTogglePlay,
  onSelectTrack,
  volume,
  onChangeVolume,
  nowPlayingTitle,
  nowPlayingSrc,
  loopEnabled,
  onToggleLoop,
}: MusicModalProps) {
  const ANIM_MS = 180;
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const id = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(id);
    }
    setVisible(false);
    const id = window.setTimeout(() => setShouldRender(false), ANIM_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!shouldRender) return null;
  const current = tracks[currentTrackIndex] ?? tracks[0];

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center transition duration-200 ${
        visible ? "opacity-100 backdrop-blur-sm" : "opacity-0 backdrop-blur-0 pointer-events-none"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-[560px] max-w-[92vw] h-[440px] max-h-[88vh] rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md shadow-2xl p-4 flex flex-col gap-3 transition duration-200 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-black/20 p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1.5 rounded-md text-sm capitalize ${
                  activeTab === tab ? "bg-white/20 text-white" : "text-white/75 hover:text-white"
                }`}
                onClick={() => onChangeTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white"
              onClick={onTogglePlay}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="text-sm text-white/85 truncate min-h-6">
          {nowPlayingTitle ? `Now: ${nowPlayingTitle}` : current ? `Selected: ${current.title}` : "No track selected"}
        </div>

        <div className="flex-1 min-h-0 rounded-xl border border-white/20 bg-white/5 p-2 overflow-auto space-y-1">
          {tracks.map((track, index) => {
            const active = isPlaying && track.src === nowPlayingSrc;
            return (
              <button
                key={track.src}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-white/8 text-white/80 hover:bg-white/15 hover:text-white"
                }`}
                onClick={() => onSelectTrack(index)}
              >
                {track.title}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="text-xs text-white/75">Volume ({Math.round(volume * 100)}%)</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(e) => onChangeVolume(Number(e.currentTarget.value) / 100)}
            className="w-full accent-white"
          />
        </label>
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>
            {loopEnabled
              ? "Loop: current track repeats"
              : "Loop off: auto-advance within this category"}
          </span>
          <button
            className="px-2.5 py-1 rounded-md border border-white/20 bg-white/10 hover:bg-white/20 text-white"
            onClick={onToggleLoop}
          >
            {loopEnabled ? "Disable loop" : "Enable loop"}
          </button>
        </div>
      </div>
    </div>
  );
}
