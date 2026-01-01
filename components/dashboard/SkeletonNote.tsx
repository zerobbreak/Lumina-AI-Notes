import { motion } from "framer-motion";

export const SkeletonNote = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto p-8 space-y-8 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl"
    >
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="h-12 w-3/4 bg-white/10 rounded-xl animate-pulse" />
        <div className="flex gap-3">
          <div className="h-6 w-24 bg-white/5 rounded-full animate-pulse" />
          <div className="h-6 w-20 bg-white/5 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-6 pt-4">
        <div className="space-y-3">
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-11/12 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-white/5 rounded animate-pulse" />
        </div>

        <div className="h-40 w-full bg-white/5 rounded-xl animate-pulse" />

        <div className="space-y-3">
          <div className="h-8 w-1/3 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
};
