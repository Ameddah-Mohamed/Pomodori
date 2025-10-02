import { Pause, Play, RotateCcw } from "lucide-react";
import Timer from "./Timer.tsx";

export default function ControlDock() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="flex flex-col gap-6 p-6 rounded-2xl bg-white/10 backdrop-blur-xs shadow-lg">
        
        {/* Timer + icons row */}
        <div className="flex items-center gap-4">
          <Timer duration={3684000} />

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
              <Play className="w-6 h-6 text-white" />
            </button>
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
              <Pause className="w-6 h-6 text-white" />
            </button>
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
              <RotateCcw className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Mode buttons row */}
        <div className="flex justify-center gap-4">
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
            Focus
          </button>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
            Short-Break
          </button>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
            Long-Break
          </button>
        </div>
      </div>
    </div>
  );
}
