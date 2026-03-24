import { memo } from "react";
import type { TaskState } from "@/types/events";
import { PipelineStep } from "./PipelineStep";

export const TaskPipeline = memo(function TaskPipeline({ tasks }: { tasks: TaskState[] }) {
  if (tasks.length === 0) return null;

  return (
    <div role="list" aria-label="Task pipeline" className="flex items-start justify-center gap-0 py-3 px-4 border-b border-border">
      {tasks.map((task, i) => (
        <PipelineStep key={task.description} task={task} isLast={i === tasks.length - 1} />
      ))}
    </div>
  );
});
