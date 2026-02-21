import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "./usePomodoroEngine";

const TOAST_DURATION_MS = 4000;

export default function useNotificationCenter() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const ensureNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  const notifySessionEnd = useCallback(
    (session: Session) => {
      const titles: Record<Session, string> = {
        focus: "Focus session finished",
        short: "Short break finished",
        long: "Long break finished",
      };
      const bodies: Record<Session, string> = {
        focus: "Time for a break!",
        short: "Back to focus 💪",
        long: "Cycle complete! 🎉",
      };

      const title = titles[session];
      const body = bodies[session];

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }

      showToast(`${title} — ${body}`);
    },
    [showToast]
  );

  return {
    toast,
    showToast,
    ensureNotificationPermission,
    notifySessionEnd,
  };
}
