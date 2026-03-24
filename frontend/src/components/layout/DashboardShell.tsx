import type { ReactNode } from "react";

export function DashboardShell({
  header,
  leftSidebar,
  center,
  rightSidebar,
}: {
  header: ReactNode;
  leftSidebar: ReactNode;
  center: ReactNode;
  rightSidebar: ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden min-w-[760px]">
      {header}
      <div className="flex-1 grid grid-cols-[240px_1fr_260px] overflow-hidden">
        <aside aria-label="Agents" className="border-r border-border overflow-y-auto">
          {leftSidebar}
        </aside>
        <main id="main-content" className="flex flex-col overflow-hidden">
          {center}
        </main>
        <aside aria-label="Metrics & Tools" className="border-l border-border overflow-y-auto p-3 space-y-2">
          {rightSidebar}
        </aside>
      </div>
    </div>
  );
}
