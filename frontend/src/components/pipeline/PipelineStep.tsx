import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { TaskState } from "@/types/events";

export function PipelineStep({ task, isLast }: { task: TaskState; isLast: boolean }) {
  const isPending = task.status === "pending";
  const isActive = task.status === "active";
  const isDone = task.status === "done";
  const isError = task.status === "error";

  return (
    <div className="flex items-center gap-0" role="listitem" aria-label={`Task: ${task.description}, status: ${task.status}`}>
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <motion.div
            className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors ${
              isPending ? "border-text-secondary/30 bg-transparent" :
              isActive ? "border-accent bg-accent/20" :
              isDone ? "border-success bg-success/20" :
              "border-error bg-error/20"
            }`}
            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
            transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
          >
            {isDone && <Check size={14} className="text-success" aria-hidden="true" />}
            {isError && <X size={14} className="text-error" aria-hidden="true" />}
            {isActive && <span className="w-2 h-2 rounded-full bg-accent animate-pulse-fast" />}
          </motion.div>
        </div>
        <span className={`text-[10px] font-display font-medium ${isActive ? "text-text-primary" : "text-text-secondary"}`}>
          {task.description}
        </span>
        <span className="text-[9px] text-text-secondary/60 truncate max-w-[80px]">{task.agent.split(" ").pop()}</span>
      </div>
      {!isLast && (
        <div className={`w-8 h-[2px] mx-1 mt-[-18px] ${isDone ? "bg-success/40" : "bg-border"} ${isPending ? "opacity-40" : ""}`} />
      )}
    </div>
  );
}
