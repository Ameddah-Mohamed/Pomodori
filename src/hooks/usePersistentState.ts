import { useEffect, useState } from "react";

type PersistentOptions<T> = {
  validate?: (value: unknown) => value is T;
};

export default function usePersistentState<T>(
  key: string,
  fallback: T,
  options?: PersistentOptions<T>
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed: unknown = JSON.parse(raw);
      if (options?.validate && !options.validate(parsed)) return fallback;
      return (parsed as T) ?? fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures (private mode, quota limits).
    }
  }, [key, value]);

  return [value, setValue] as const;
}
