import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePersistentState from "./usePersistentState";

export type Session = "focus" | "short" | "long";
export type TimerMode = "playing" | "paused";

export type DurationsMin = {
  focusMin: number;
  shortMin: number;
  longMin: number;
};

const DEFAULT_DURATIONS_MIN: DurationsMin = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
};
const RUNTIME_KEY = "pomodoro:runtime";

const isDurationsMin = (value: unknown): value is DurationsMin => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.focusMin === "number" &&
    typeof obj.shortMin === "number" &&
    typeof obj.longMin === "number"
  );
};
const isSession = (value: unknown): value is Session =>
  value === "focus" || value === "short" || value === "long";
const isTimerMode = (value: unknown): value is TimerMode =>
  value === "playing" || value === "paused";
const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

type RuntimeSnapshot = {
  session: Session;
  mode: TimerMode;
  remainingMs: number;
  updatedAt: number;
};

const isRuntimeSnapshot = (value: unknown): value is RuntimeSnapshot => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    isSession(obj.session) &&
    isTimerMode(obj.mode) &&
    isNonNegativeNumber(obj.remainingMs) &&
    isNonNegativeNumber(obj.updatedAt)
  );
};

const clamp = (n: number, min = 1, max = 180) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

const normalizeDurations = (d: DurationsMin): DurationsMin => ({
  focusMin: clamp(d.focusMin),
  shortMin: clamp(d.shortMin),
  longMin: clamp(d.longMin),
});

const toMs = (minutes: number) => minutes * 60_000;

const getSessionDurationMs = (session: Session, d: DurationsMin) => {
  if (session === "focus") return toMs(d.focusMin);
  if (session === "short") return toMs(d.shortMin);
  return toMs(d.longMin);
};

export default function usePomodoroEngine() {
  const [durationsMin, setDurationsMin] = usePersistentState<DurationsMin>(
    "pomodoroDurations",
    DEFAULT_DURATIONS_MIN,
    { validate: isDurationsMin }
  );

  const [session, setSession] = usePersistentState<Session>("pomodoro:session", "focus", {
    validate: isSession,
  });
  const [sessionCounter, setSessionCounter] = usePersistentState<number>(
    "pomodoro:sessionCounter",
    0,
    { validate: isNonNegativeNumber }
  );
  const [resumeEnabled, setResumeEnabled] = usePersistentState<boolean>(
    "pomodoro:resumeEnabled",
    false,
    { validate: isBoolean }
  );
  const [mode, setMode] = useState<TimerMode>("paused");
  const [timerKey, setTimerKey] = useState(0);
  const [duration, setDuration] = useState(() =>
    getSessionDurationMs(session, durationsMin)
  );
  const [remainingMs, setRemainingMs] = useState(duration);
  const hydratedRef = useRef(false);
  const skipSessionResetRef = useRef(false);

  const baseDuration = useMemo(
    () => getSessionDurationMs(session, durationsMin),
    [session, durationsMin]
  );

  useEffect(() => {
    if (skipSessionResetRef.current) {
      skipSessionResetRef.current = false;
      return;
    }
    setMode("paused");
    setDuration(baseDuration);
    setRemainingMs(baseDuration);
    setTimerKey((k) => k + 1);
  }, [baseDuration]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (!resumeEnabled) return;

    try {
      const raw = localStorage.getItem(RUNTIME_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isRuntimeSnapshot(parsed)) return;

      const elapsed = Math.max(0, Date.now() - parsed.updatedAt);
      const adjustedRemaining =
        parsed.mode === "playing"
          ? Math.max(0, parsed.remainingMs - elapsed)
          : parsed.remainingMs;

      if (adjustedRemaining <= 0) return;

      skipSessionResetRef.current = true;
      setSession(parsed.session);
      setDuration(adjustedRemaining);
      setRemainingMs(adjustedRemaining);
      setMode(parsed.mode);
      setTimerKey((k) => k + 1);
    } catch {
      // Ignore malformed runtime snapshots.
    }
  }, [resumeEnabled, setSession]);

  useEffect(() => {
    if (!resumeEnabled) {
      try {
        localStorage.removeItem(RUNTIME_KEY);
      } catch {
        // Ignore storage failures.
      }
      return;
    }

    const snapshot: RuntimeSnapshot = {
      session,
      mode,
      remainingMs,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(RUNTIME_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures.
    }
  }, [mode, remainingMs, resumeEnabled, session]);

  const resetToBase = () => {
    setDuration(baseDuration);
    setRemainingMs(baseDuration);
    setMode("paused");
    setTimerKey((k) => k + 1);
  };

  const saveDurations = (next: DurationsMin) => {
    setDurationsMin(normalizeDurations(next));
  };

  const completeCurrentSession = () => {
    setMode("paused");
    setRemainingMs(0);
    if (session === "focus") setSessionCounter((prev) => prev + 1);
    return session;
  };

  const syncRemaining = useCallback((ms: number) => {
    setRemainingMs(Math.max(0, Math.floor(ms)));
  }, []);

  return {
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
  };
}
