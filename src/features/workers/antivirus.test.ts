import { it, expect, vi } from "vitest";
import { createServer } from "node:net";
vi.mock("server-only", () => ({}));
import { scanWithClamd } from "./antivirus";
async function scanner(
  reply: string,
  work: (port: number, received: () => Buffer) => Promise<void>,
) {
  let input = Buffer.alloc(0);
  const server = createServer((socket) =>
    socket.on("data", (chunk) => {
      input = Buffer.concat([input, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      if (input.length >= 14) {
        socket.write(reply.slice(0, 5));
        socket.end(reply.slice(5) + "\0");
      }
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server unavailable");
  try {
    await work(address.port, () => input);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
it("uses native ClamAV INSTREAM framing and requires an explicit clean verdict", async () => {
  await scanner("stream: OK", async (port, input) => {
    await scanWithClamd(Buffer.from("fixture"), { host: "127.0.0.1", port, tls: false });
    const frame = input();
    expect(frame.subarray(0, 10).toString()).toBe("zINSTREAM\0");
    expect(frame.readUInt32BE(10)).toBe(7);
  });
});
it.each([
  ["stream: Eicar-Test-Signature FOUND", "UNSAFE"],
  ["UNKNOWN COMMAND", "SCANNER"],
])("fails closed for %s", async (reply, error) => {
  await scanner(reply, async (port) => {
    await expect(
      scanWithClamd(Buffer.from("fixture"), { host: "127.0.0.1", port, tls: false }),
    ).rejects.toThrow(error);
  });
});
