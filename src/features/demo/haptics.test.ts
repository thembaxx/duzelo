import { describe, expect, it } from "vitest";
import { demoHapticPattern, playDemoHaptic } from "./haptics";

describe("demo haptic fallback", () => {
  it("keeps patterns brief and distinguishes an explicit save", () => {
    expect(demoHapticPattern("select")).toBe(8);
    expect(demoHapticPattern("save")).toEqual([12, 20, 12]);
  });
  it("can render on the server without hardware vibration", () => {
    expect(playDemoHaptic()).toBe(false);
  });
});
