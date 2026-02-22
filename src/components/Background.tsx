import { useState, useEffect } from "react";

type BackgroundProps = {
  src: string;
  fadeDuration: number;
};

export default function Background({ src, fadeDuration = 800 }: BackgroundProps) {
  const isVideo = (value: string) => /\.(webm|mp4)$/i.test(value);
  const [activeSrc, setActiveSrc] = useState(src);
  const [activeIsVideo, setActiveIsVideo] = useState(isVideo(src));
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [pendingIsVideo, setPendingIsVideo] = useState(false);
  const [pendingVisible, setPendingVisible] = useState(false);

  useEffect(() => {
    if (!src || src === activeSrc) return;
    const nextIsVideo = isVideo(src);
    if (nextIsVideo) {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.src = src;
      video.onloadeddata = () => {
        setPendingIsVideo(true);
        setPendingSrc(src);
        requestAnimationFrame(() => setPendingVisible(true));
      };
      return;
    }
    const image = new Image();
    image.src = src;
    image.onload = () => {
      setPendingIsVideo(false);
      setPendingSrc(src);
      requestAnimationFrame(() => setPendingVisible(true));
    };
  }, [activeSrc, src]);

  useEffect(() => {
    if (!pendingVisible || !pendingSrc) return;
    const id = window.setTimeout(() => {
      setActiveSrc(pendingSrc);
      setActiveIsVideo(pendingIsVideo);
      setPendingSrc(null);
      setPendingVisible(false);
    }, fadeDuration);
    return () => window.clearTimeout(id);
  }, [fadeDuration, pendingIsVideo, pendingSrc, pendingVisible]);

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
        />
      ) : (
        <img
          src={activeSrc}
          alt=""
          loading="eager"
          decoding="async"
          style={{ opacity: 1 }}
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
            style={{
              transition: `opacity ${fadeDuration}ms ease`,
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
              transition: `opacity ${fadeDuration}ms ease`,
              opacity: pendingVisible ? 1 : 0,
            }}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        )
      )}
    </div>
  );
}
