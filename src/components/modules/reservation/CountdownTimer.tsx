"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

interface Props {
  expiresAt: string | Date;
  onExpired?: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: Props) {
  const { minutes, seconds, isExpired } = useCountdown(expiresAt);

  const isUrgent = !isExpired && minutes === 0 && seconds <= 60;

  if (isExpired) {
    onExpired?.();
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-rose-500">
        <Timer className="h-4 w-4" />
        <span>Expired</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-mono font-medium tabular-nums transition-colors",
        isUrgent
          ? "border-rose-500/40 bg-rose-500/10 text-rose-400 animate-pulse"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
      )}
    >
      <Timer className="h-3.5 w-3.5 shrink-0" />
      <span>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
      <span className="font-sans text-xs font-normal opacity-70">remaining</span>
    </div>
  );
}
