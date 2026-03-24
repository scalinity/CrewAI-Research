import { useRef, useCallback, useEffect } from "react";
import type { ThoughtEntryData } from "@/types/events";
import { ThoughtEntry } from "./ThoughtEntry";

const AGENT_ORDER = ["Senior Research Analyst", "Technical Writer", "Quality Reviewer"];

function getAgentIndex(name: string): number {
  const idx = AGENT_ORDER.indexOf(name);
  return idx >= 0 ? idx : 0;
}

export function ThoughtStream({ thoughts }: { thoughts: ThoughtEntryData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAutoScrolling.current = distFromBottom < 50;
  }, []);

  // useEffect is necessary here: scrollTo is a DOM mutation (external side effect) that must
  // run after React commits, not during render. The dependency on thoughts.length ensures
  // it fires only when new entries are added. No declarative pattern replaces post-commit DOM scroll.
  useEffect(() => {
    if (!isAutoScrolling.current || !containerRef.current) return;
    containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [thoughts.length]);

  let lastAgent = "";

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto relative"
      role="log"
      aria-label="Agent thought stream"
      aria-live="polite"
    >
      {thoughts.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-text-secondary/60 text-[13px] font-display">
            Waiting for agent activity...
          </p>
        </div>
      )}
      {thoughts.map((entry) => {
        const showSeparator = entry.agent_name !== lastAgent && entry.type !== "agent_start";
        lastAgent = entry.agent_name;

        return (
          <div key={entry.id}>
            {showSeparator && lastAgent && (
              <div className="flex items-center gap-2 px-3 py-1 mt-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] text-text-secondary/60 uppercase tracking-wider font-display">
                  {entry.agent_name}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <ThoughtEntry entry={entry} agentIndex={getAgentIndex(entry.agent_name)} />
          </div>
        );
      })}
    </div>
  );
}
