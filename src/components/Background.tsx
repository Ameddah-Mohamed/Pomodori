import { useState, useEffect } from "react";

type BackgroundProps = {
  src: string;
  fadeDuration: number;
};

export default function Background({ src, fadeDuration = 800 }: BackgroundProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const image = new Image();
    image.src = src;
    image.onload = () => setLoaded(true);
  }, [src]);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden -z-10">
      <img
        src={src}
        alt=""
        loading="lazy"
        style={{
          transition: `opacity ${fadeDuration}ms ease`,
          opacity: loaded ? 1 : 0,
        }}
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
    </div>
  );
}
