import { memo } from "react";
import { motion } from "framer-motion";
import type { ThoughtEntryData } from "@/types/events";
import { formatTimestamp, truncateText } from "@/utils/formatters";
import { ToolCallDetail } from "./ToolCallDetail";

const AGENT_COLORS: Record<number, string> = {
  0: "text-accent-blue",
  1: "text-accent-purple",
  2: "text-accent-emerald",
};

const TYPE_BADGES: Record<string, { label: string; style: string }> = {
  thought:       { label: "Thinking",   style: "bg-accent-blue/20 text-accent-blue" },
  tool_call:     { label: "Tool Call",  style: "bg-accent-amber/20 text-accent-amber" },
  tool_result:   { label: "Result",     style: "bg-accent-emerald/20 text-accent-emerald" },
  task_complete: { label: "Task Done",  style: "bg-accent-emerald/20 text-accent-emerald" },
  delegation:    { label: "Delegate",   style: "bg-accent-purple/20 text-accent-purple" },
  error:         { label: "Error",      style: "bg-accent-rose/20 text-accent-rose" },
  agent_start:   { label: "Started",    style: "bg-accent-blue/15 text-accent-blue" },
};

// Memoized: ThoughtEntry props are immutable once created (data comes from reducer).
// This prevents re-rendering all 500 entries when a new thought is appended.
export const ThoughtEntry = memo(function ThoughtEntry({
  entry,
  agentIndex,
}: {
  entry: ThoughtEntryData;
  agentIndex: number;
}) {
  const badge = TYPE_BADGES[entry.type] ?? TYPE_BADGES.thought;
  const agentColor = AGENT_COLORS[agentIndex % 3] ?? "text-text-muted";
  const isToolType = entry.type === "tool_call" || entry.type === "tool_result";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex gap-2 py-1.5 px-3 hover:bg-bg-elevated/50 rounded transition-colors"
    >
      <span className="font-mono text-[10px] text-text-muted/60 shrink-0 pt-0.5 w-[52px]">
        {formatTimestamp(entry.timestamp)}
      </span>

      <span className={`text-[11px] font-display font-medium shrink-0 w-[80px] truncate pt-0.5 ${agentColor}`}>
        {entry.agent_name.split(" ").pop()}
      </span>

      <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-mono font-medium uppercase tracking-wider shrink-0 ${badge.style}`}>
        {badge.label}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-text-primary/90 font-mono leading-relaxed whitespace-pre-wrap break-words">
          {entry.type === "tool_call" && entry.tool_name
            ? entry.tool_name
            : truncateText(entry.content, 500)}
        </p>
        {isToolType && (
          <div className="mt-1">
            <ToolCallDetail
              toolInput={entry.tool_input}
              toolOutput={entry.tool_output}
              latencyMs={entry.latency_ms}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
});
