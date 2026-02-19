import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// SRS backfill: reduced from hourly to every 6 hours to save DB usage
crons.interval(
  "srs_backfill",
  { hours: 6 },
  internal.flashcards.initializeSrsFieldsInternal,
  { limit: 200 },
);

crons.interval(
  "srs_build_daily_queues",
  { hours: 6 },
  internal.flashcards.buildDailyQueuesInternal,
  {},
);

crons.interval(
  "file_queue_positions",
  { hours: 4 },
  internal.files.recomputeFileQueuePositionsInternal,
  {},
);

crons.interval(
  "streak_reset",
  { hours: 24 },
  internal.users.resetStreaksInternal,
  {},
);

export default crons;
