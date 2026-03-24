import { CollapsibleSection } from "@/components/shared/CollapsibleSection";

export function ToolCallDetail({
  toolInput,
  toolOutput,
  latencyMs,
}: {
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  latencyMs?: number;
}) {
  return (
    <CollapsibleSection title="Details">
      <div className="space-y-2 text-[11px]">
        {toolInput && Object.keys(toolInput).length > 0 && (
          <div>
            <span className="text-text-muted text-[10px] uppercase tracking-wider font-mono">Input</span>
            <pre className="mt-0.5 font-mono text-[11px] text-text-muted bg-bg-primary rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap">
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          </div>
        )}
        {toolOutput && (
          <div>
            <span className="text-text-muted text-[10px] uppercase tracking-wider font-mono">Output</span>
            <pre className="mt-0.5 font-mono text-[11px] text-text-muted bg-bg-primary rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
              {toolOutput.length > 1000 ? toolOutput.slice(0, 1000) + "..." : toolOutput}
            </pre>
          </div>
        )}
        {latencyMs != null && latencyMs > 0 && (
          <span className="inline-block text-[10px] text-text-muted bg-bg-elevated rounded px-1.5 py-0.5 font-mono">
            {Math.round(latencyMs)}ms
          </span>
        )}
      </div>
    </CollapsibleSection>
  );
}
