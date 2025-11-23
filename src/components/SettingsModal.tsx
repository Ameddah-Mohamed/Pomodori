import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";

type SettingsModalProps = {
  open: boolean;
  onClose: (returnValue?: string) => void;

  initialFocusMin: number;
  initialShortMin: number;
  initialLongMin: number;
  onSave: (p: { focusMin: number; shortMin: number; longMin: number }) => void;

  wallpapers: string[];
  selectedWallpaper: string;
  onSelectWallpaper: (src: string) => void;
};

export default function SettingsModal({
  open,
  onClose,
  initialFocusMin,
  initialShortMin,
  initialLongMin,
  onSave,
  wallpapers,
  selectedWallpaper,
  onSelectWallpaper,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [focusMin, setFocusMin] = useState<number>(initialFocusMin);
  const [shortMin, setShortMin] = useState<number>(initialShortMin);
  const [longMin, setLongMin] = useState<number>(initialLongMin);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setFocusMin(initialFocusMin);
    setShortMin(initialShortMin);
    setLongMin(initialLongMin);
  }, [open, initialFocusMin, initialShortMin, initialLongMin]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const handler = () => onClose(d.returnValue);
    d.addEventListener("close", handler);
    return () => d.removeEventListener("close", handler);
  }, [onClose]);

  const close = (reason?: string) => dialogRef.current?.close(reason ?? "close");
  const clamp = (n: number, min = 1, max = 180) =>
    Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

  const handleSave = () => {
    const payload = {
      focusMin: clamp(focusMin),
      shortMin: clamp(shortMin),
      longMin: clamp(longMin),
    };
    onSave(payload);
    close("save");
  };

  return (
    <dialog ref={dialogRef} className="m-0 p-0 bg-transparent">
      <div
        className="fixed inset-0 grid place-items-center backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) close("backdrop");
        }}
      >
        <div className="w-[480px] max-w-[92vw] rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md shadow-2xl p-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Settings</h2>

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
          </div>

          {/* Body */}
          <div className="space-y-5">
            <NumberField label="Focus (minutes)" value={focusMin} onChange={setFocusMin} />
            <NumberField label="Short Break (minutes)" value={shortMin} onChange={setShortMin} />
            <NumberField label="Long Break (minutes)" value={longMin} onChange={setLongMin} />
            <p className="text-xs text-white/70">Values are clamped between 1 and 180 minutes.</p>

            <div className="pt-2">
              <h3 className="mb-2 text-sm font-semibold text-white/90">Wallpaper</h3>
              <div className="grid grid-cols-3 gap-3 max-h-48 overflow-auto pr-1">
                {wallpapers.map((src) => {
                  const selected = src === selectedWallpaper;
                  return (
                    <button
                      key={src}
                      onClick={() => onSelectWallpaper(src)}
                      className="relative group overflow-hidden rounded-xl transition focus:outline-none"
                    >
                      <img
                        src={src}
                        alt="Wallpaper"
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
    </dialog>
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
            w-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 pr-16 text-white
            outline-none focus:ring-2 focus:ring-white/30 focus:outline-none
          "
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-white/70">
          min
        </span>
      </div>
    </label>
  );
}