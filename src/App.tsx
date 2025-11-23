import { useEffect, useState } from "react";
import Background from "./components/Background";
import ControlDock from "./components/ControlDock";

const WALLPAPERS = [
  "/images/wallpapers/back-1.webp",
  "/images/wallpapers/back-2.webp",
  "/images/wallpapers/back-3.webp",
  "/images/wallpapers/back-4.webp",
  "/images/wallpapers/back-5.webp",
  "/images/wallpapers/back-6.webp",
  "/images/wallpapers/back-7.webp",
  "/images/wallpapers/back-8.webp",
  "/images/wallpapers/back-9.webp",
  "/images/wallpapers/back-10.webp",
];

export default function App() {
  // read once from localStorage; fall back to first wallpaper
  const [bg, setBg] = useState<string>(() => {
    try {
      return localStorage.getItem("pomodoro:bg") ?? WALLPAPERS[0];
    } catch {
      return WALLPAPERS[0];
    }
  });

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
        wallpapers={WALLPAPERS}
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