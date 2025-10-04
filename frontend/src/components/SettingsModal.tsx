// SettingsModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type SettingsModalProps = {
  open: boolean;
  onClose?: (reason?: string) => void;

  // initial values (minutes)
  initialFocusMin?: number;
  initialShortMin?: number;
  initialLongMin?: number;

  // send minutes back to parent on Save
  onSave?: (values: { focusMin: number; shortMin: number; longMin: number }) => void;
};

export default function SettingsModal({
  open,
  onClose,
  initialFocusMin = 25,
  initialShortMin = 5,
  initialLongMin = 15,
  onSave,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // local minutes state
  const [focusMin, setFocusMin] = useState<number>(initialFocusMin);
  const [shortMin, setShortMin] = useState<number>(initialShortMin);
  const [longMin, setLongMin] = useState<number>(initialLongMin);

  const [sessionCounter, setSessionCounter ] = useState<number>(0);

  // open/close native dialog when prop changes
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // sync fields from props upon open
      setFocusMin(initialFocusMin);
      setShortMin(initialShortMin);
      setLongMin(initialLongMin);
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
    if (!open && d.open) d.close();
  }, [open, initialFocusMin, initialShortMin, initialLongMin]);

  // forward native close event
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const handler = () => onClose?.(d.returnValue);
    d.addEventListener("close", handler);
    return () => d.removeEventListener("close", handler);
  }, [onClose]);

  const close = (reason?: string) => dialogRef.current?.close(reason ?? "");

  const clamp = (n: number, min = 1, max = 180) =>
    Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

  const handleSave = () => {
    // Always normalize & clamp on save
    const f = clamp(focusMin);
    const s = clamp(shortMin);
    const l = clamp(longMin);
    onSave?.({ focusMin: f, shortMin: s, longMin: l });
    close("save");
  };

  return (
    <dialog ref={dialogRef} className="m-0 p-0 bg-transparent">
      {/* fullscreen overlay centers the card, darkens + blurs background */}
      <div
        className="fixed inset-0 grid place-items-center backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) close("backdrop");
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* glass card */}
        <div className="w-[420px] max-w-[90vw] rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md shadow-2xl p-6">
          {/* header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 id="settings-title" className="text-lg font-semibold">
              Settings
            </h2>
            <button
              onClick={() => close("x")}
              className="rounded-lg p-2 bg-white/10 hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* body */}
          <div className="space-y-4">
            <MinutesInput
              label="Focus (minutes)"
              value={focusMin}
              onChange={setFocusMin}
              inputRef={firstInputRef}
              min={1}
              max={180}
            />
            <MinutesInput
              label="Short Break (minutes)"
              value={shortMin}
              onChange={setShortMin}
              min={1}
              max={180}
            />
            <MinutesInput
              label="Long Break (minutes)"
              value={longMin}
              onChange={setLongMin}
              min={1}
              max={180}
            />
            <p className="text-xs text-white/70">Range: 1–180 minutes.</p>
          </div>

          {/* footer */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              className="rounded-xl border border-white/20 px-4 py-2 bg-white/10 hover:bg-white/20"
              onClick={() => close("cancel")}
            >
              Cancel
            </button>
            <button
              className="rounded-xl px-4 py-2 bg-white/90 text-gray-900 hover:bg-white"
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

function MinutesInput({
  label,
  value,                 // number from parent
  onChange,              // (n: number) => void
  inputRef,
  min = 1,
  max = 180,             // unused with text input, kept for signature parity
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  min?: number;
  max?: number;

}) {
  const [draft, setDraft] = React.useState(String(value));

  // keep UI in sync if parent changes value externally
  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (n: number) =>
    Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

  // allow only digits while typing; still allow empty string
  const sanitize = (s: string) => s.replace(/\D+/g, "").slice(0, 3); // up to 3 digits

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = sanitize(e.currentTarget.value);
    setDraft(next);
    // don't call onChange here; wait for blur or Save so users can finish typing
  };

  const handleBlur = () => {
    if (draft === "") {
      // empty → fall back to min
      setDraft(String(min));
      onChange(min);
      return;
    }
    // parseInt removes leading zeros automatically ("090" -> 90)
    const n = parseInt(draft, 10);
    const c = clamp(n);
    setDraft(String(c)); // normalize UI
    onChange(c);         // commit clean number to parent
  };

  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-white/85">
          {label}
        </span>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"               
          inputMode="numeric"      
          pattern="[0-9]*"
          value={draft}            
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="off"
          className="
            w-full rounded-2xl
            bg-white/10 backdrop-blur-md
            border border-white/20
            px-4 py-3 pr-16
            text-white placeholder-white/60
            shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]
            outline-none transition
            focus:border-white/40 focus:ring-2 focus:ring-white/30
          "
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-white/70">
          min
        </span>
      </div>
    </label>
  );
}