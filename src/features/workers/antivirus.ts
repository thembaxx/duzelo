import "server-only";
import { connect as tcpConnect, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { workerConfig } from "./config";
export interface ScannerEndpoint {
  host: string;
  port: number;
  tls: boolean;
}
export async function scanWithClamd(bytes: Buffer, endpoint: ScannerEndpoint): Promise<void> {
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new Error("FILE");
  return new Promise((resolve, reject) => {
    let socket: Socket,
      settled = false,
      response = Buffer.alloc(0);
    function finish(error?: string) {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(new Error(error));
      else resolve();
    }
    function send() {
      const size = Buffer.alloc(4);
      size.writeUInt32BE(bytes.length);
      socket.write(Buffer.concat([Buffer.from("zINSTREAM\0"), size, bytes, Buffer.alloc(4)]));
    }
    socket = endpoint.tls
      ? tlsConnect(
          {
            host: endpoint.host,
            port: endpoint.port,
            servername: endpoint.host,
            rejectUnauthorized: true,
          },
          send,
        )
      : tcpConnect({ host: endpoint.host, port: endpoint.port }, send);
    socket.setTimeout(15000, () => finish("SCANNER"));
    socket.on("error", () => finish("SCANNER"));
    socket.on("data", (chunk) => {
      response = Buffer.concat([response, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      if (response.length > 4096) {
        finish("SCANNER");
        return;
      }
      const end = response.indexOf(0);
      if (end < 0) return;
      const text = response.subarray(0, end).toString("utf8");
      if (text === "stream: OK") finish();
      else if (/^stream: .+ FOUND$/.test(text)) finish("UNSAFE");
      else finish("SCANNER");
    });
    socket.on("close", () => {
      if (!settled) finish("SCANNER");
    });
  });
}
export async function scanWorkerImage(bytes: Buffer) {
  const config = workerConfig();
  if (!config) throw new Error("UNAVAILABLE");
  await scanWithClamd(bytes, config.scanner);
}
