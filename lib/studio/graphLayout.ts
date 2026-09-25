/**
 * Force layout for the Studio note graph. Deterministic (same graph, same
 * picture), so the map doesn't reshuffle every time the Studio remounts.
 */

export type LayoutNode = { id: string; size: number };
export type LayoutEdge = { source: string; target: string };
export type Point = { x: number; y: number };

/** Room each node needs around its circle for its two-line title. */
const LABEL_CLEARANCE = 70;
/** Preferred length of an edge, centre to centre. */
const EDGE_LENGTH = 170;
/** Scales how hard notes push apart; lower packs the map tighter. */
const REPULSION = 0.3;
/** Pull toward the centre; keeps unlinked notes and clusters compact. */
const GRAVITY = 0.5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Node size in px, from how connected the note is. Matches the node view. */
export function graphNodeSize(connectionCount: number) {
  return Math.min(76, 32 + connectionCount * 8);
}

/**
 * Returns each node's top-left position (what React Flow expects).
 *
 * Nodes start on a sunflower spiral, best-connected first so hubs sit in the
 * middle, then a Fruchterman–Reingold pass with cooling pulls linked notes
 * together and pushes everything else apart. A final pass removes overlaps
 * so no two circles (or their labels) sit on top of each other.
 */
export function layoutGraph(nodes: LayoutNode[], edges: LayoutEdge[]): Map<string, Point> {
  const out = new Map<string, Point>();
  const n = nodes.length;
  if (n === 0) return out;

  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const links: [number, number][] = [];
  const degree = new Array<number>(n).fill(0);
  for (const e of edges) {
    const a = index.get(e.source);
    const b = index.get(e.target);
    if (a === undefined || b === undefined || a === b) continue;
    links.push([a, b]);
    degree[a]++;
    degree[b]++;
  }

  // Seed: hubs first on a spiral, spaced about one edge apart.
  const order = nodes.map((_, i) => i).sort((a, b) => degree[b] - degree[a] || nodes[a].id.localeCompare(nodes[b].id));
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  order.forEach((i, rank) => {
    const r = EDGE_LENGTH * 0.6 * Math.sqrt(rank);
    x[i] = r * Math.cos(rank * GOLDEN_ANGLE);
    y[i] = r * Math.sin(rank * GOLDEN_ANGLE);
  });

  const radius = nodes.map((node) => node.size / 2 + LABEL_CLEARANCE);
  const k = EDGE_LENGTH;
  const iterations = n > 400 ? 120 : 300;
  let temperature = EDGE_LENGTH;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);

  for (let iter = 0; iter < iterations; iter++) {
    dx.fill(0);
    dy.fill(0);

    // Repulsion between every pair.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = x[i] - x[j];
        let ddy = y[i] - y[j];
        let dist = Math.hypot(ddx, ddy);
        if (dist < 0.01) {
          // Coincident: nudge apart in a fixed direction.
          ddx = Math.cos(i + j);
          ddy = Math.sin(i + j);
          dist = 1;
        }
        const force = (REPULSION * k * k) / dist;
        const fx = (ddx / dist) * force;
        const fy = (ddy / dist) * force;
        dx[i] += fx;
        dy[i] += fy;
        dx[j] -= fx;
        dy[j] -= fy;
      }
    }

    // Attraction along links.
    for (const [a, b] of links) {
      const ddx = x[a] - x[b];
      const ddy = y[a] - y[b];
      const dist = Math.hypot(ddx, ddy) || 1;
      const force = (dist * dist) / k;
      const fx = (ddx / dist) * force;
      const fy = (ddy / dist) * force;
      dx[a] -= fx;
      dy[a] -= fy;
      dx[b] += fx;
      dy[b] += fy;
    }

    // Gentle gravity so unlinked notes and separate clusters don't drift off.
    for (let i = 0; i < n; i++) {
      dx[i] -= x[i] * GRAVITY;
      dy[i] -= y[i] * GRAVITY;
    }

    // Move, capped by the temperature, which cools each step.
    for (let i = 0; i < n; i++) {
      const len = Math.hypot(dx[i], dy[i]);
      if (len === 0) continue;
      const step = Math.min(len, temperature);
      x[i] += (dx[i] / len) * step;
      y[i] += (dy[i] / len) * step;
    }
    temperature = Math.max(1, temperature * 0.97);
  }

  // Resolve leftover overlaps.
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ddx = x[i] - x[j];
        const ddy = y[i] - y[j];
        const dist = Math.hypot(ddx, ddy) || 0.01;
        const min = radius[i] + radius[j];
        if (dist >= min) continue;
        const push = (min - dist) / 2;
        const ux = dist === 0.01 ? 1 : ddx / dist;
        const uy = dist === 0.01 ? 0 : ddy / dist;
        x[i] += ux * push;
        y[i] += uy * push;
        x[j] -= ux * push;
        y[j] -= uy * push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  nodes.forEach((node, i) => {
    out.set(node.id, { x: x[i] - node.size / 2, y: y[i] - node.size / 2 });
  });
  return out;
}
