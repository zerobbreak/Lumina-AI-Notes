"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface PresenceIndicatorProps {
  noteId: Id<"notes">;
  className?: string;
  maxAvatars?: number;
}

interface Viewer {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  lastSeen: number;
}

// Generate a consistent color based on user ID
function getAvatarColor(userId: string): string {
  const colors = [
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-blue-500",
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PresenceIndicator({
  noteId,
  className,
  maxAvatars = 5,
}: PresenceIndicatorProps) {
  const viewers = useQuery(api.presence.getViewers, { noteId }) as Viewer[] | undefined;

  if (!viewers || viewers.length === 0) {
    return null;
  }

  const displayedViewers = viewers.slice(0, maxAvatars);
  const extraCount = viewers.length - maxAvatars;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default",
              className
            )}
          >
            {/* Avatar Stack */}
            <div className="flex -space-x-2">
              <AnimatePresence mode="popLayout">
                {displayedViewers.map((viewer, index) => (
                  <motion.div
                    key={viewer.id}
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="relative"
                    style={{ zIndex: displayedViewers.length - index }}
                  >
                    {viewer.userImage ? (
                      <img
                        src={viewer.userImage}
                        alt={viewer.userName}
                        className="w-6 h-6 rounded-full border-2 border-[#0a0a12] object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border-2 border-[#0a0a12] flex items-center justify-center text-[10px] font-medium text-white",
                          getAvatarColor(viewer.userId)
                        )}
                      >
                        {getInitials(viewer.userName)}
                      </div>
                    )}
                    {/* Online indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#0a0a12]" />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Extra count */}
              {extraCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-6 h-6 rounded-full border-2 border-[#0a0a12] bg-gray-700 flex items-center justify-center text-[10px] font-medium text-white"
                >
                  +{extraCount}
                </motion.div>
              )}
            </div>

            {/* Label */}
            <span className="text-xs text-gray-400 ml-1">
              {viewers.length === 1 ? "1 viewer" : `${viewers.length} viewing`}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-zinc-900 border-white/10 p-3 max-w-xs"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Users className="w-4 h-4 text-indigo-400" />
              Currently viewing
            </div>
            <div className="space-y-1.5">
              {viewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {viewer.userImage ? (
                    <img
                      src={viewer.userImage}
                      alt={viewer.userName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white",
                        getAvatarColor(viewer.userId)
                      )}
                    >
                      {getInitials(viewer.userName)}
                    </div>
                  )}
                  <span className="text-gray-300 truncate max-w-[150px]">
                    {viewer.userName}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    online
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for tight spaces
export function PresenceIndicatorCompact({
  noteId,
  className,
}: {
  noteId: Id<"notes">;
  className?: string;
}) {
  const viewerCount = useQuery(api.presence.getViewerCount, { noteId });

  if (!viewerCount || viewerCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20",
              className
            )}
          >
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">
              {viewerCount}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-zinc-900 border-white/10">
          <span className="text-xs">
            {viewerCount} {viewerCount === 1 ? "person" : "people"} viewing
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
