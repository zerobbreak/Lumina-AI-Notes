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

export default crons;
