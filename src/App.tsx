import { useEffect, useState } from "react";
import Background from "./components/Background";
import ControlDock from "./components/ControlDock";
import type { VideoBackground, Wallpaper } from "./types/wallpaper";

const FALLBACK_WALLPAPERS: Wallpaper[] = [
  { id: "back-1", src: "/images/wallpapers/back-1.webp", thumb: "/images/wallpapers/back-1.webp" },
];

const isWallpaper = (value: unknown): value is Wallpaper => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === "string" && typeof obj.src === "string";
};

type VideoManifestItem = {
  id: string;
  title: string;
  sources: { webm?: string; mp4?: string };
  thumb: string;
};

const isVideoManifestItem = (value: unknown): value is VideoManifestItem => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const sources = obj.sources as Record<string, unknown> | undefined;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.thumb === "string" &&
    !!sources &&
    (typeof sources.webm === "string" || typeof sources.mp4 === "string")
  );
};

export default function App() {
  const [manifestReady, setManifestReady] = useState(false);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(FALLBACK_WALLPAPERS);
  const [videoBackgrounds, setVideoBackgrounds] = useState<VideoBackground[]>([]);

  // read once from localStorage; fall back to first wallpaper
  const [bg, setBg] = useState<string>(() => {
    try {
      return localStorage.getItem("pomodoro:bg") ?? FALLBACK_WALLPAPERS[0].src;
    } catch {
      return FALLBACK_WALLPAPERS[0].src;
    }
  });

  useEffect(() => {
    let cancelled = false;
    const loadManifest = async () => {
      try {
        const response = await fetch("/images/wallpapers/manifest.json");
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (!Array.isArray(data)) return;
        const parsed = data.filter(isWallpaper);
        if (!cancelled && parsed.length > 0) {
          setWallpapers(parsed);
          setManifestReady(true);
        }
      } catch {
        // Keep fallback wallpapers.
      }
    };
    void loadManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadVideoManifest = async () => {
      try {
        const response = await fetch("/videos/manifest.json");
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (!data || typeof data !== "object") return;
        const items = (data as { items?: unknown }).items;
        if (!Array.isArray(items)) return;
        const parsed = items
          .filter(isVideoManifestItem)
          .map((item) => ({
            id: item.id,
            title: item.title,
            webm: item.sources.webm,
            mp4: item.sources.mp4,
            thumb: item.thumb,
          }));
        if (!cancelled) setVideoBackgrounds(parsed);
      } catch {
        // Optional feature; keep image backgrounds only.
      }
    };
    void loadVideoManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!manifestReady || wallpapers.length === 0) return;
    const bgExists =
      wallpapers.some((item) => item.src === bg) ||
      videoBackgrounds.some((item) => item.webm === bg || item.mp4 === bg);
    if (bgExists) return;
    setBg(wallpapers[0].src);
  }, [bg, manifestReady, wallpapers, videoBackgrounds]);

  useEffect(() => {
    if (wallpapers.length === 0 && videoBackgrounds.length === 0) return;
    const preload = () => {
      for (const wallpaper of wallpapers) {
        const image = new Image();
        image.src = wallpaper.thumb ?? wallpaper.src;
      }
      for (const video of videoBackgrounds) {
        const image = new Image();
        image.src = video.thumb;
      }
    };
    const idleCallback = (window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    }).requestIdleCallback;
    if (idleCallback) {
      const id = idleCallback(preload);
      return () => {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }
    const timerId = window.setTimeout(preload, 120);
    return () => window.clearTimeout(timerId);
  }, [wallpapers, videoBackgrounds]);

  // persist whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("pomodoro:bg", bg);
    } catch {}
  }, [bg]);

  return (
    <>
      <Background src={bg} fadeDuration={800} />

      {/* Pass choices + current + setter to your UI */}
      <ControlDock
        wallpapers={wallpapers}
        videoBackgrounds={videoBackgrounds}
        background={bg}
        onChangeBackground={setBg}
      />

      {/* footer */}
      <div className="fixed bottom-4 w-full flex justify-center">
        <p className="text-white text-center text-sm bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
          Made with ❤️ by <span className="font-semibold">Ameddah Mohamed</span>
        </p>
      </div>
    </>
  );
}
