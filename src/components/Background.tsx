import { useState, useEffect } from "react";

type BackgroundProps = {
  src: string;
  fadeDuration: number;
};

export default function Background({ src, fadeDuration = 800 }: BackgroundProps) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [pendingVisible, setPendingVisible] = useState(false);

  useEffect(() => {
    if (!src || src === activeSrc) return;

    const image = new Image();
    image.src = src;
    image.onload = () => {
      setPendingSrc(src);
      requestAnimationFrame(() => setPendingVisible(true));
    };
  }, [activeSrc, src]);

  useEffect(() => {
    if (!pendingVisible || !pendingSrc) return;
    const id = window.setTimeout(() => {
      setActiveSrc(pendingSrc);
      setPendingSrc(null);
      setPendingVisible(false);
    }, fadeDuration);
    return () => window.clearTimeout(id);
  }, [fadeDuration, pendingSrc, pendingVisible]);

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden -z-10"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 20%, rgba(25,25,35,0.95), rgba(8,8,12,1))",
      }}
    >
      <img
        src={activeSrc}
        alt=""
        loading="eager"
        decoding="async"
        style={{
          opacity: 1,
        }}
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      {pendingSrc && (
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
      )}
    </div>
  );
}
