import { it, expect } from "vitest";
import { clusterPoints } from "./clusters";
const points = [
  { slug: "c", point: { longitude: 100, latitude: 0 } },
  { slug: "a", point: { longitude: 0, latitude: 0 } },
  { slug: "b", point: { longitude: 10, latitude: 0 } },
];
const project = (p: { longitude: number; latitude: number }) => ({ x: p.longitude, y: p.latitude });
it("clusters overlapping public markers while retaining every worker once", () => {
  const groups = clusterPoints(points, project);
  expect(groups.map((g) => g.length)).toEqual([2, 1]);
  expect(
    groups
      .flat()
      .map((p) => p.slug)
      .sort(),
  ).toEqual(["a", "b", "c"]);
});
it("is stable under reordered results and panning at the same zoom", () => {
  const original = clusterPoints(points, project);
  expect(
    clusterPoints([...points].reverse(), (p) => ({ x: p.longitude + 700, y: p.latitude - 200 })),
  ).toEqual(original);
});
it("separates areas when a user zooms in and keeps rendered anchors apart", () => {
  const groups = clusterPoints(points, (p) => ({ x: p.longitude * 10, y: p.latitude * 10 }));
  expect(groups).toHaveLength(3);
  for (let a = 0; a < groups.length; a++)
    for (let b = a + 1; b < groups.length; b++)
      expect(
        Math.abs(groups[a]![0]!.point.longitude - groups[b]![0]!.point.longitude) * 10,
      ).toBeGreaterThanOrEqual(56);
});
