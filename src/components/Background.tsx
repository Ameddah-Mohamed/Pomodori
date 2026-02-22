import { useEffect, useRef, useState } from "react";

type BackgroundProps = {
  src: string;
  fadeDuration: number;
};

export default function Background({ src, fadeDuration = 800 }: BackgroundProps) {
  const isVideo = (value: string) => /\.(webm|mp4)$/i.test(value);
  const transitionMs = Math.max(1200, fadeDuration);
  const [activeSrc, setActiveSrc] = useState(src);
  const [activeIsVideo, setActiveIsVideo] = useState(isVideo(src));
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [pendingIsVideo, setPendingIsVideo] = useState(false);
  const [pendingVisible, setPendingVisible] = useState(false);
  const transitionIdRef = useRef(0);
  const commitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!src || src === activeSrc) return;
    transitionIdRef.current += 1;
    const id = transitionIdRef.current;

    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }

    setPendingVisible(false);
    const nextIsVideo = isVideo(src);
    setPendingIsVideo(nextIsVideo);

    if (!nextIsVideo) {
      const image = new Image();
      image.src = src;
      image.onload = () => {
        if (id !== transitionIdRef.current) return;
        setPendingSrc(src);
        requestAnimationFrame(() => {
          if (id !== transitionIdRef.current) return;
          setPendingVisible(true);
        });
      };
      image.onerror = () => {
        if (id !== transitionIdRef.current) return;
        setPendingSrc(src);
        requestAnimationFrame(() => {
          if (id !== transitionIdRef.current) return;
          setPendingVisible(true);
        });
      };
      return;
    }

    setPendingSrc(src);
  }, [activeSrc, src]);

  const maybeStartVideoFade = async (video: HTMLVideoElement, id: number) => {
    if (id !== transitionIdRef.current) return;
    try {
      const playPromise = video.play();
      if (playPromise) await playPromise;
    } catch {
      return;
    }
    if (id !== transitionIdRef.current) return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime > 0) {
      setPendingVisible(true);
      return;
    }

    const onTimeUpdate = () => {
      if (id !== transitionIdRef.current) return;
      if (video.currentTime <= 0) return;
      cleanup();
      setPendingVisible(true);
    };
    const onCanPlay = () => {
      if (id !== transitionIdRef.current) return;
      if (video.currentTime <= 0) return;
      cleanup();
      setPendingVisible(true);
    };
    const cleanup = () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("canplay", onCanPlay);
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("canplay", onCanPlay);
  };

  useEffect(() => {
    if (!pendingSrc || !pendingVisible) return;
    const currentTransitionId = transitionIdRef.current;
    const id = window.setTimeout(() => {
      if (currentTransitionId !== transitionIdRef.current) return;
      const committedSrc = pendingSrc;
      const committedIsVideo = pendingIsVideo;
      setActiveSrc(committedSrc);
      setActiveIsVideo(committedIsVideo);
      // For static targets, keep pending layer for one extra paint to avoid post-commit flash.
      if (!committedIsVideo) {
        requestAnimationFrame(() => {
          if (currentTransitionId !== transitionIdRef.current) return;
          setPendingSrc(null);
          setPendingVisible(false);
        });
        return;
      }
      setPendingSrc(null);
      setPendingVisible(false);
    }, transitionMs);
    commitTimerRef.current = id;
    return () => window.clearTimeout(id);
  }, [pendingSrc, pendingIsVideo, pendingVisible, transitionMs]);

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden -z-10"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 20%, rgba(25,25,35,0.95), rgba(8,8,12,1))",
      }}
    >
      {activeIsVideo ? (
        <video
          key={activeSrc}
          src={activeSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute top-0 left-0 w-full h-full object-cover"
          style={{
            opacity: pendingSrc && pendingVisible ? 0 : 1,
            transition: pendingSrc ? `opacity ${transitionMs}ms ease` : "none",
          }}
        />
      ) : (
        <img
          src={activeSrc}
          alt=""
          loading="eager"
          decoding="async"
          style={{
            opacity: pendingSrc && pendingVisible ? 0 : 1,
            transition: pendingSrc ? `opacity ${transitionMs}ms ease` : "none",
          }}
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      )}
      {pendingSrc && (
        pendingIsVideo ? (
          <video
            key={pendingSrc}
            src={pendingSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={(event) => {
              void maybeStartVideoFade(event.currentTarget, transitionIdRef.current);
            }}
            onCanPlay={(event) => {
              void maybeStartVideoFade(event.currentTarget, transitionIdRef.current);
            }}
            onTimeUpdate={(event) => {
              void maybeStartVideoFade(event.currentTarget, transitionIdRef.current);
            }}
            style={{
              transition: `opacity ${transitionMs}ms ease`,
              opacity: pendingVisible ? 1 : 0,
            }}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src={pendingSrc}
            alt=""
            loading="eager"
            decoding="async"
            style={{
              transition: `opacity ${transitionMs}ms ease`,
              opacity: pendingVisible ? 1 : 0,
            }}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        )
      )}
      {pendingSrc && !pendingVisible && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="rounded-full bg-black/40 backdrop-blur-md px-4 py-2 text-white text-sm border border-white/25 shadow-xl">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/85 animate-pulse" />
              Loading background
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
