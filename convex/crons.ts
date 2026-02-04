import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly maintenance: backfill SRS fields and build daily queues
crons.interval(
  "srs_backfill",
  { hours: 1 },
  internal.flashcards.initializeSrsFieldsInternal,
  { limit: 200 },
);

crons.interval(
  "srs_build_daily_queues",
  { hours: 1 },
  internal.flashcards.buildDailyQueuesInternal,
  {},
);

crons.interval(
  "file_queue_positions",
  { hours: 1 },
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
