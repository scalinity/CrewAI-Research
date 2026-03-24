import { motion } from "framer-motion";
import type { AgentState } from "@/types/events";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { truncateText } from "@/utils/formatters";

const BORDER_COLOR: Record<string, string> = {
  idle: "border-l-text-muted/30",
  thinking: "border-l-accent-blue",
  tool_call: "border-l-accent-amber",
  done: "border-l-accent-emerald",
  error: "border-l-accent-rose",
};

export function AgentCard({ agent }: { agent: AgentState }) {
  const borderClass = BORDER_COLOR[agent.status] ?? BORDER_COLOR.idle;
  const dimmed = agent.status === "done" ? "opacity-75" : "";

  return (
    <motion.article
      layout
      aria-label={`Agent: ${agent.name}, status: ${agent.status}`}
      className={`rounded-lg border border-border border-l-2 ${borderClass} bg-bg-surface p-3 ${dimmed}`}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PulseIndicator status={agent.status} />
          <span className="font-display font-semibold text-[13px] text-text-primary truncate">
            {agent.name}
          </span>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {agent.currentTool && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[10px] text-accent-amber font-mono">{agent.currentTool}</span>
        </div>
      )}

      {agent.lastThought && (
        <p className="mt-1.5 text-[11px] text-text-muted italic font-mono leading-relaxed truncate">
          {truncateText(agent.lastThought, 80)}
        </p>
      )}
    </motion.article>
  );
}
