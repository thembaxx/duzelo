import { it, expect } from "vitest";
import { mergeMessages } from "./merge";
import { sendSchema } from "./schema";
import type { MessageView } from "./types";
const message = (sequence: number, body = "text"): MessageView => ({
  id: "m" + sequence,
  sequence,
  body,
  at: "2026-11-02T12:00:00Z",
  sender: "you",
  deleted: false,
  assets: [],
});
it("orders late responses and deduplicates replayed messages", () =>
  expect(
    mergeMessages([message(3), message(1)], [message(2), message(3, "updated")]).map((m) => [
      m.sequence,
      m.body,
    ]),
  ).toEqual([
    [1, "text"],
    [2, "text"],
    [3, "updated"],
  ]));
it("rejects sender/status/sequence injection and duplicate attachment IDs", () => {
  const id = "a0000000-0000-0000-0000-000000000001",
    data = { conversationId: id, body: "Hello", assetIds: [] };
  expect(sendSchema.safeParse(data).success).toBe(true);
  for (const extra of [
    { senderId: id },
    { sequence: 1 },
    { status: "sent" },
    { assetIds: [id, id] },
  ])
    expect(sendSchema.safeParse({ ...data, ...extra }).success).toBe(false);
});
