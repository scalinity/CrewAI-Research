import { memo } from "react";
import type { AgentState } from "@/types/events";
import { AgentCard } from "./AgentCard";

export const AgentPanel = memo(function AgentPanel({ agents }: { agents: AgentState[] }) {
  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
      <h2 className="font-mono font-semibold text-[10px] uppercase tracking-wider text-text-secondary mb-1">
        Agents
      </h2>
      {agents.length === 0 && (
        <p className="text-[11px] text-text-secondary italic">Waiting for crew to start...</p>
      )}
      {agents.map((agent) => (
        <AgentCard key={agent.name} agent={agent} />
      ))}
    </div>
  );
});
