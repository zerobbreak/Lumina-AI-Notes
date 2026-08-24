import { Sparkles } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="h-full bg-background flex items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-xl bg-indigo-500/10 animate-ping" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium">Loading Workspace</span>
          <span className="text-xs text-muted-foreground/60">Preparing your notes...</span>
        </div>
      </div>
    </div>
  );
}
