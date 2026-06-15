import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function ActiveTimer({ checkInTime }: { checkInTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const checkInDate = new Date(checkInTime).getTime();

    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - checkInDate) / 1000));
      setElapsed(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [checkInTime]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  // SVG Progress Ring calculations
  // Radius = 50, Circumference = 2 * PI * R = 314
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const standardWorkdaySeconds = 8 * 3600; // 8 hours
  const percentage = Math.min(100, (elapsed / standardWorkdaySeconds) * 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* SVG Progress Ring */}
        <svg className="w-full h-full transform -rotate-90">
          {/* Base circle track */}
          <circle
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="72"
            cy="72"
          />
          {/* Animated active progress */}
          <circle
            className="text-emerald-500 transition-all duration-1000"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="72"
            cy="72"
          />
        </svg>

        {/* Floating Ticking Hours inside ring */}
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-800 dark:text-slate-100 leading-none">
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
            Active Hours
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
        <Clock className="w-3.5 h-3.5" />
        Clocked In at {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
