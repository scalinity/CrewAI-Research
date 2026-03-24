import { motion } from "framer-motion";
import type { CrewStatus, ConnectionStatus } from "@/types/events";
import { RunControls } from "@/components/controls/RunControls";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function Header({
  crewStatus,
  connectionStatus,
  onStartRun,
  onCancelRun,
}: {
  crewStatus: CrewStatus;
  connectionStatus: ConnectionStatus;
  onStartRun: (topic: string, model: string, thinkingLevel: string) => void;
  onCancelRun: () => void;
}) {
  const isRunning = crewStatus === "running";

  return (
    <motion.header
      className="flex items-center gap-4 px-4 py-2.5 border-b border-border relative"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="shrink-0 pl-[68px]" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <span className="font-mono font-semibold text-[9px] uppercase tracking-[0.2em] text-accent/70 block leading-none mb-0.5">
          Mission Control
        </span>
        <span className="font-display font-bold text-[15px] text-text-primary tracking-tight leading-tight">
          Agent Observatory
        </span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <RunControls crewStatus={crewStatus} onStartRun={onStartRun} onCancelRun={onCancelRun} />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={crewStatus} />
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${connectionStatus === "connected" ? "bg-success" : "bg-error"}`}
          role="status"
          aria-label={`Connection ${connectionStatus}`}
          title={`Connection: ${connectionStatus}`}
        />
      </div>

      {isRunning && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-accent/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
    </motion.header>
  );
}
