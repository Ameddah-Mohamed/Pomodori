import { useEffect, useMemo, useState } from "react";
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

const isDurationsMin = (value: unknown): value is DurationsMin => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.focusMin === "number" &&
    typeof obj.shortMin === "number" &&
    typeof obj.longMin === "number"
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

  const [session, setSession] = useState<Session>("focus");
  const [mode, setMode] = useState<TimerMode>("paused");
  const [timerKey, setTimerKey] = useState(0);
  const [sessionCounter, setSessionCounter] = useState(0);

  const duration = useMemo(
    () => getSessionDurationMs(session, durationsMin),
    [session, durationsMin]
  );

  useEffect(() => {
    setMode("paused");
    setTimerKey((k) => k + 1);
  }, [session, durationsMin.focusMin, durationsMin.shortMin, durationsMin.longMin]);

  const resetToBase = () => {
    setMode("paused");
    setTimerKey((k) => k + 1);
  };

  const saveDurations = (next: DurationsMin) => {
    setDurationsMin(normalizeDurations(next));
  };

  const completeCurrentSession = () => {
    setMode("paused");
    if (session === "focus") setSessionCounter((prev) => prev + 1);
    return session;
  };

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
    saveDurations,
    completeCurrentSession,
  };
}
