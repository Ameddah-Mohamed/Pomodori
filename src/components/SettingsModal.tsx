import { useEffect, useState } from "react";
import { X, Check, ChevronUp, ChevronDown, Info } from "lucide-react";
import type { Wallpaper } from "../types/wallpaper";

type SettingsModalProps = {
  open: boolean;
  onClose: (returnValue?: string) => void;

  initialFocusMin: number;
  initialShortMin: number;
  initialLongMin: number;
  initialResumeEnabled: boolean;
  onSave: (p: {
    focusMin: number;
    shortMin: number;
    longMin: number;
    resumeEnabled: boolean;
  }) => void;
  onRealtimeChange: (p: {
    focusMin: number;
    shortMin: number;
    longMin: number;
    resumeEnabled: boolean;
  }) => void;

  wallpapers: Wallpaper[];
  selectedWallpaper: string;
  onSelectWallpaper: (src: string) => void;
};

export default function SettingsModal({
  open,
  onClose,
  initialFocusMin,
  initialShortMin,
  initialLongMin,
  initialResumeEnabled,
  onSave,
  onRealtimeChange,
  wallpapers,
  selectedWallpaper,
  onSelectWallpaper,
}: SettingsModalProps) {
  const [focusMin, setFocusMin] = useState<number>(initialFocusMin);
  const [shortMin, setShortMin] = useState<number>(initialShortMin);
  const [longMin, setLongMin] = useState<number>(initialLongMin);
  const [resumeEnabled, setResumeEnabled] = useState<boolean>(initialResumeEnabled);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFocusMin(initialFocusMin);
    setShortMin(initialShortMin);
    setLongMin(initialLongMin);
    setResumeEnabled(initialResumeEnabled);
    setShowInfo(false);
  }, [
    open,
    initialFocusMin,
    initialShortMin,
    initialLongMin,
    initialResumeEnabled,
  ]);
  const close = (reason?: string) => onClose(reason ?? "close");
  const clamp = (n: number, min = 1, max = 180) =>
    Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;
  const buildPayload = () => ({
    focusMin: clamp(focusMin),
    shortMin: clamp(shortMin),
    longMin: clamp(longMin),
    resumeEnabled,
  });

  const handleSave = () => {
    const payload = buildPayload();
    onSave(payload);
    close("save");
  };

  useEffect(() => {
    if (!open) return;
    onRealtimeChange(buildPayload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    focusMin,
    shortMin,
    longMin,
    resumeEnabled,
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close("backdrop");
      }}
    >
      <div className="w-[480px] max-w-[92vw] max-h-[88vh] overflow-y-auto rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md shadow-2xl p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              aria-label="Show shortcuts info"
              onClick={() => setShowInfo((prev) => !prev)}
              className="
                rounded-lg p-2 bg-white/10 hover:bg-white/20
                focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-0
              "
            >
              <Info className="h-5 w-5" />
            </button>
            {/* Close button (fixed outline) */}
            <button
              onClick={() => close("x")}
              className="
                rounded-lg p-2 bg-white/10 hover:bg-white/20
                focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-0
              "
            >
              <X className="h-5 w-5" />
            </button>

            {showInfo && (
              <div className="absolute right-0 top-12 z-10 w-72 rounded-xl border border-white/20 bg-[#101014]/90 p-3 text-sm text-white shadow-2xl">
                <p className="mb-2 text-xs uppercase tracking-wide text-white/70">Shortcuts</p>
                <p className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5">
                  <span>Play / Pause</span>
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">Space</kbd>
                </p>
                <p className="mt-1.5 flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5">
                  <span>Reset timer</span>
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">R</kbd>
                </p>
                <p className="mt-2 text-xs text-white/70">
                  Drag the timer panel and release to snap to a corner or center.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5">
          <NumberField label="Focus (minutes)" value={focusMin} onChange={setFocusMin} />
          <NumberField label="Short Break (minutes)" value={shortMin} onChange={setShortMin} />
          <NumberField label="Long Break (minutes)" value={longMin} onChange={setLongMin} />
          <p className="text-xs text-white/70">Values are clamped between 1 and 180 minutes.</p>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3">
            <span className="text-sm text-white/90">Resume timer after page refresh</span>
            <button
              type="button"
              role="checkbox"
              aria-checked={resumeEnabled}
              onClick={() => setResumeEnabled((prev) => !prev)}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${
                resumeEnabled
                  ? "border-white/80 bg-white text-black"
                  : "border-white/50 bg-white/10 text-transparent"
              }`}
            >
              <Check className="h-4 w-4" />
            </button>
          </label>

          <div className="pt-2">
            <h3 className="mb-2 text-sm font-semibold text-white/90">Wallpaper</h3>
            <div className="grid grid-cols-3 gap-3 max-h-48 overflow-auto pr-1">
              {wallpapers.map((wallpaper) => {
                const src = wallpaper.src;
                const selected = src === selectedWallpaper;
                return (
                  <button
                    key={wallpaper.id}
                    onClick={() => onSelectWallpaper(src)}
                    className="relative group overflow-hidden rounded-xl transition focus:outline-none"
                  >
                    <img
                      src={wallpaper.thumb ?? src}
                      alt={wallpaper.label ?? "Wallpaper"}
                      loading="lazy"
                      decoding="async"
                      className={`h-20 w-full object-cover transition-transform duration-200 ${
                        selected ? "scale-105" : "group-hover:scale-[1.02]"
                      }`}
                    />
                    <div
                      className={`absolute inset-0 rounded-xl ${
                        selected ? "ring-2 ring-white/60" : "ring-0 group-hover:ring-1 ring-white/30"
                      }`}
                    />
                    {selected && (
                      <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border border-white/20 px-4 py-2 bg-white/10 hover:bg-white/20 focus:outline-none"
            onClick={() => close("cancel")}
          >
            Cancel
          </button>
          <button
            className="rounded-xl px-4 py-2 bg-white/90 text-gray-900 hover:bg-white focus:outline-none"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 180,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const safeValue = Number.isFinite(value) ? value : min;
  const stepDown = () => onChange(Math.max(min, safeValue - step));
  const stepUp = () => onChange(Math.min(max, safeValue + step));

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-white/85">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? String(value) : ""}
          onChange={(e) => {
            const num = Number(e.currentTarget.value);
            onChange(Number.isFinite(num) ? num : NaN);
          }}
          className="
            no-spinner w-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 pr-14 text-white
            outline-none focus:ring-2 focus:ring-white/30 focus:outline-none
          "
        />
        <div className="absolute inset-y-1 right-1 flex w-10 flex-col overflow-hidden rounded-lg border border-white/20 bg-white/10">
          <button
            type="button"
            onClick={stepUp}
            className="flex-1 grid place-items-center hover:bg-white/20"
            aria-label={`Increase ${label}`}
          >
            <ChevronUp className="h-4 w-4 text-white/90" />
          </button>
          <button
            type="button"
            onClick={stepDown}
            className="flex-1 grid place-items-center border-t border-white/20 hover:bg-white/20"
            aria-label={`Decrease ${label}`}
          >
            <ChevronDown className="h-4 w-4 text-white/90" />
          </button>
        </div>
      </div>
    </label>
  );
}
