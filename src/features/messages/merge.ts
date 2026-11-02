import type { MessageView } from "./types";
export function mergeMessages(previous: MessageView[], incoming: MessageView[]) {
  const map = new Map(previous.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}
