import type { CalendarRecording } from "@/lib/api/adapters/calendar";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";
import type { PlanItemDto } from "@/types/api/home";
import { addDays, type DayBundle } from "./month";

/**
 * The week planner's arithmetic: which hours to draw, where each block sits,
 * and where today's plan fits around what's already there. Minutes are
 * counted from the day's local midnight.
 */

const MINUTE = 60_000;
/** Brightspace events carry a start only; draw them an hour long. */
export const EVENT_MINUTES = 60;
/** Shorter blocks are drawn at this height so their title fits. */
export const MIN_BLOCK_MINUTES = 20;
/** Suggestions start on a quarter hour, a little after now. */
const SLOT_STEP = 15;
/** The planner won't suggest study after this hour. */
export const LAST_STUDY_HOUR = 22;

export type BlockKind = "event" | "session" | "suggested";

export type Block = {
  id: string;
  kind: BlockKind;
  start: number;
  end: number;
  title: string;
  courseId?: string;
  /** Set on suggested blocks: the plan item behind them. */
  plan?: PlanItemDto;
  /** Side-by-side position when blocks overlap. */
  lane: number;
  lanes: number;
};

/** The Sunday-first week holding `date`. */
export function weekOf(date: Date): Date[] {
  const start = addDays(date, -date.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const minutesInto = (ms: number, day: Date) => Math.round((ms - day.getTime()) / MINUTE);

function eventBlock(d: DeadlineModel, day: Date): Omit<Block, "lane" | "lanes"> {
  const start = minutesInto(d.dueAt, day);
  return { id: d._id, kind: "event", start, end: start + EVENT_MINUTES, title: d.title, courseId: d.courseId };
}

/** A recording is saved when it stops, so it ran for `duration` before that. */
function sessionBlock(r: CalendarRecording, day: Date): Omit<Block, "lane" | "lanes"> {
  const end = minutesInto(r.createdAt, day);
  const length = Math.max(MIN_BLOCK_MINUTES, Math.round((r.duration ?? 0) / 60));
  return { id: r._id, kind: "session", start: Math.max(0, end - length), end, title: r.title };
}

/**
 * Side-by-side lanes for blocks that overlap. Blocks that touch a cluster
 * share its lane count, so the cluster lines up.
 */
export function layoutLanes(blocks: Array<Omit<Block, "lane" | "lanes">>): Block[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Block[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((b) => b.lane + 1));
    for (const b of cluster) b.lanes = lanes;
    out.push(...cluster);
    cluster = [];
  };
  for (const b of sorted) {
    if (b.start >= clusterEnd && cluster.length) flush();
    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? -Infinity, c.end);
    let lane = laneEnds.findIndex((end) => end <= b.start);
    if (lane === -1) lane = laneEnds.length;
    cluster.push({ ...b, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  if (cluster.length) flush();
  return out;
}

/**
 * Fits today's plan into the gaps after now, in plan order, each item in the
 * first gap long enough for it. What doesn't fit before the last study hour
 * comes back unplaced.
 */
export function fitPlan(
  plan: PlanItemDto[],
  busy: Array<{ start: number; end: number }>,
  nowMinutes: number,
): { placed: Array<Omit<Block, "lane" | "lanes">>; unplaced: PlanItemDto[] } {
  const dayEnd = LAST_STUDY_HOUR * 60;
  const taken = busy.map((b) => ({ ...b })).sort((a, b) => a.start - b.start);
  const earliest = Math.ceil((nowMinutes + 5) / SLOT_STEP) * SLOT_STEP;
  const placed: Array<Omit<Block, "lane" | "lanes">> = [];
  const unplaced: PlanItemDto[] = [];

  for (const item of plan) {
    const length = Math.max(SLOT_STEP, item.minutes);
    let start = earliest;
    for (const t of taken) {
      if (t.end <= start) continue;
      if (t.start >= start + length) break;
      start = Math.ceil(t.end / SLOT_STEP) * SLOT_STEP;
    }
    if (start + length > dayEnd) {
      unplaced.push(item);
      continue;
    }
    const block = { id: `plan-${item.kind}-${item.id}`, kind: "suggested" as const, start, end: start + length, title: "", plan: item };
    placed.push(block);
    taken.push({ start: block.start, end: block.end });
    taken.sort((a, b) => a.start - b.start);
  }
  return { placed, unplaced };
}

/** Hours to draw: 07:00 to 23:00, widened to fit anything outside. */
export function hourSpan(blocks: Array<{ start: number; end: number }>) {
  const first = Math.min(7, ...blocks.map((b) => Math.floor(b.start / 60)));
  const last = Math.max(23, ...blocks.map((b) => Math.ceil(b.end / 60)));
  return { first: Math.max(0, first), last: Math.min(24, last) };
}

/** One day's timed blocks: events and recorded sessions, plus today's suggestions. */
export function dayBlocks(
  day: Date,
  bundle: DayBundle | undefined,
  opts: { showActivity: boolean; suggestions?: Array<Omit<Block, "lane" | "lanes">> },
): Block[] {
  const timed: Array<Omit<Block, "lane" | "lanes">> = [];
  for (const d of bundle?.deadlines ?? []) if (d.kind === "event") timed.push(eventBlock(d, day));
  if (opts.showActivity) for (const r of bundle?.recordings ?? []) timed.push(sessionBlock(r, day));
  timed.push(...(opts.suggestions ?? []));
  return layoutLanes(timed);
}

/** Busy time on a day, for fitting the plan around: events and sessions. */
export function busyTimes(day: Date, bundle: DayBundle | undefined) {
  return dayBlocks(day, bundle, { showActivity: true }).map(({ start, end }) => ({ start, end }));
}
