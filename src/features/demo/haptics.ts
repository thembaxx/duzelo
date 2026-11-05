/** Progressive tactile feedback for deliberate interactions within the fictional demo.
 * Browsers without vibration support (including iOS Safari) retain normal visual feedback.
 */
export type DemoHaptic = "select" | "save";
export function demoHapticPattern(intent: DemoHaptic): number | number[] {
  return intent === "save" ? [12, 20, 12] : 8;
}
export function playDemoHaptic(intent: DemoHaptic = "select"): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  if (document.visibilityState !== "visible" || !document.hasFocus()) return false;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    return false;
  return navigator.vibrate(demoHapticPattern(intent));
}
