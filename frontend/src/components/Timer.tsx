import { useEffect, useState } from "react";

// working in milliseconds
export default function Timer({ duration }: { duration: number }) {
  const [time, setTime] = useState(duration);

  useEffect(() => {
    const endtime = Date.now() + duration;

    const tick = () => {
      let remaining = endtime - Date.now();
      setTime(Math.max(remaining, 0));
    };

    tick(); 
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [duration]);

    const get_formatted_time = (milliseconds: number) => {
    let total_seconds = Math.floor(milliseconds / 1000);
    let total_minutes = Math.floor(total_seconds / 60);
    let total_hours = Math.floor(total_minutes / 60);

    let seconds = total_seconds % 60;
    let minutes = total_minutes % 60;
    let hours = total_hours % 24;

    // Pad minutes and seconds with leading zeros (e.g. 05:09)
    const pad = (num: number) => String(num).padStart(2, "0");

    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    } else {
        return `${pad(minutes)}:${pad(seconds)}`;
    }
    };

  return (
    <>
      <div className="text-gray-200 font-bold text-7xl">{get_formatted_time(time)}</div>
    </>
  );
}