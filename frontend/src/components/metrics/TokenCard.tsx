import { formatTokens } from "@/utils/formatters";
import type { MetricsState, AgentState } from "@/types/events";

const TOKEN_PROGRESS_MAX = 50_000;

export function TokenCard({ metrics, agents }: { metrics: MetricsState; agents: AgentState[] }) {
  const pct = Math.min((metrics.totalTokens / TOKEN_PROGRESS_MAX) * 100, 100);

  return (
    <div className="bg-bg-secondary rounded border border-border border-l-[3px] border-l-accent p-3">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 font-mono">Tokens</div>
      <div className="text-2xl font-display font-bold text-text-primary">
        {formatTokens(metrics.totalTokens)}
      </div>
      <div
        className="mt-2 h-1.5 bg-bg-primary rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Token usage progress"
      >
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 text-[9px] text-text-secondary/60">
        {agents.filter(a => a.tokensUsed > 0).map((a) => (
          <span key={a.name} className="mr-2">
            {a.name.split(" ").pop()}: {formatTokens(a.tokensUsed)}
          </span>
        ))}
      </div>
    </div>
  );
}
