import { formatCost, shortModelName } from "@/utils/formatters";
import type { MetricsState } from "@/types/events";

export function CostCard({ metrics, modelName }: { metrics: MetricsState; modelName: string }) {
  const shortModel = shortModelName(modelName);

  return (
    <div className="bg-bg-surface rounded-lg border border-border p-3">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-mono">Est. Cost</div>
      <div className="text-2xl font-display font-bold text-text-primary">
        {formatCost(metrics.estimatedCost)}
      </div>
      <div className="mt-1.5">
        <span className="text-[9px] font-mono bg-bg-elevated text-text-muted rounded px-1.5 py-0.5">
          {shortModel}
        </span>
      </div>
    </div>
  );
}
