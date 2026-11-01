import type { Point } from "./schema";
// At most twenty public cards per page. Stable public anchors keep nearby
// marker buttons apart without inventing or exposing any private coordinate.
export function clusterPoints<T extends { slug: string; point: Point }>(
  cards: T[],
  project: (point: Point) => { x: number; y: number },
  gap = 56,
): T[][] {
  const groups: T[][] = [];
  for (const card of [...cards].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const point = project(card.point);
    const group = groups.find((items) => {
      const anchor = project(items[0]!.point);
      return Math.hypot(point.x - anchor.x, point.y - anchor.y) < gap;
    });
    if (group) group.push(card);
    else groups.push([card]);
  }
  return groups;
}
