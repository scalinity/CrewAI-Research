import { useState, useEffect, useRef } from "react";
import type { MetricsState, CrewStatus } from "@/types/events";
import { formatDuration } from "@/utils/formatters";

export function TimeCard({ metrics, crewStatus }: { metrics: MetricsState; crewStatus: CrewStatus }) {
  const [, setTick] = useState(0);
  const isRunning = crewStatus === "running" && metrics.startTime !== null;

  // useEffect is necessary here: setInterval is a browser timer (external side effect)
  // that must be cleaned up on unmount and when isRunning changes. No declarative
  // React pattern (derived state, key reset, event handler) can replace interval management.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const elapsed = isRunning
    ? Date.now() - metrics.startTime!
    : metrics.durationMs;

  return (
    <div className="bg-bg-secondary rounded border border-border border-l-[3px] border-l-accent p-3">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 font-mono">Time</div>
      <div className="text-2xl font-display font-bold text-text-primary">
        {formatDuration(elapsed)}
      </div>
    </div>
  );
}
