import { memo, useMemo } from "react";
import { Check, X, Wrench } from "lucide-react";
import type { ToolCallState } from "@/types/events";

export const ToolLog = memo(function ToolLog({ toolCalls }: { toolCalls: ToolCallState[] }) {
  const sorted = useMemo(() => [...toolCalls].reverse(), [toolCalls]);

  return (
    <div className="bg-bg-secondary rounded border border-border border-l-[3px] border-l-accent p-3">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-2 font-mono">Tool Calls</div>
      {sorted.length === 0 && (
        <p className="text-[10px] text-text-secondary/60 italic">No tool calls yet</p>
      )}
      <div role="log" aria-label="Tool call log" className="space-y-1 max-h-[200px] overflow-y-auto">
        {sorted.map((tc) => (
          <div key={tc.id} className="flex items-center gap-1.5 text-[10px]">
            <Wrench size={10} className="text-text-secondary/60 shrink-0" aria-hidden="true" />
            <span className="font-mono text-text-primary truncate">{tc.name}</span>
            <span className="text-text-secondary/60 truncate">{tc.agent.split(" ").pop()}</span>
            {tc.latency_ms > 0 && (
              <span className="font-mono text-text-secondary/60 shrink-0">{Math.round(tc.latency_ms)}ms</span>
            )}
            <span className="shrink-0">
              {tc.status === "success" ? (
                <Check size={10} className="text-success" aria-hidden="true" />
              ) : tc.status === "error" ? (
                <X size={10} className="text-error" aria-hidden="true" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse-fast inline-block" />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
