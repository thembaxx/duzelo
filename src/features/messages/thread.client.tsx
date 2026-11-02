"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCollaboration } from "@/features/collaboration/client-api";
import { Evidence, EvidenceUpload } from "@/features/collaboration/evidence.client";
import { jobTime } from "@/features/jobs/format";
import type { ThreadView } from "./types";
import { mergeMessages } from "./merge";
import { SafetyForm } from "./safety.client";
export function Conversation({ initial }: { initial: ThreadView }) {
  const [view, setView] = useState(initial),
    [messages, setMessages] = useState(initial.page.messages),
    [body, setBody] = useState(""),
    [assets, setAssets] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [connection, setConnection] = useState("Checking for updates…"),
    [older, setOlder] = useState(initial.page.hasMore),
    [loading, setLoading] = useState(false),
    [uploading, setUploading] = useState(false),
    api = useCollaboration(),
    generation = useRef(0),
    firstLoaded = useRef(initial.page.messages[0]?.sequence ?? 1),
    removedCursor = useRef(0),
    latest = useRef(initial.page.messages.at(-1)?.sequence ?? 0),
    input = useRef<HTMLTextAreaElement>(null);
  async function load(before = 0, signal?: AbortSignal) {
    const requestId = ++generation.current;
    const response = await fetch(
        "/api/v1/collaboration/thread?id=" +
          initial.id +
          (before ? "&before=" + before : "&after=" + latest.current) +
          "&floor=" +
          firstLoaded.current +
          "&removedAfter=" +
          removedCursor.current,
        { signal, cache: "no-store" },
      ),
      data = await response.json();
    if (signal?.aborted || requestId !== generation.current) return;
    if (!response.ok) {
      if ([401, 403].includes(response.status)) {
        setMessages([]);
        setView((v) => ({
          ...v,
          title: "Conversation unavailable",
          canRead: false,
          canSend: false,
        }));
      }
      throw new Error(data.error?.message ?? "Conversation unavailable.");
    }
    const next = data as ThreadView;
    setView(next);
    if (!next.canRead) {
      setMessages([]);
      latest.current = 0;
      return;
    }
    const removed = new Set(next.tombstones);
    removedCursor.current = next.removedCursor;
    setMessages((old) => {
      const merged = mergeMessages(old, next.page.messages).map((m) =>
        removed.has(m.id)
          ? { ...m, deleted: true, body: "Message removed by moderation.", assets: [] }
          : m,
      );
      firstLoaded.current = merged[0]?.sequence ?? 1;
      return merged;
    });
    latest.current = Math.max(latest.current, ...next.page.messages.map((m) => m.sequence));
    if (before) setOlder(next.page.hasMore);
    return (next.page.hasMore && !before) || !!next.removedCursor;
  }
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      controller: AbortController | null = null,
      delay = 5000;
    async function tick() {
      if (stopped) return;
      if (document.hidden || !navigator.onLine) {
        setConnection(
          navigator.onLine
            ? "Updates paused while this tab is hidden."
            : "Offline. Your draft stays in this tab; retry sending when connected.",
        );
        timer = setTimeout(tick, 5000);
        return;
      }
      controller = new AbortController();
      try {
        const more = await load(0, controller.signal);
        if (!stopped) {
          setConnection("Checking for saved updates every few seconds.");
          delay = more ? 100 : 5000;
        }
      } catch (e) {
        if (!stopped) {
          setConnection(e instanceof Error ? e.message : "Updates interrupted.");
          delay = Math.min(delay * 2, 30000);
        }
      } finally {
        controller = null;
        if (!stopped) timer = setTimeout(tick, delay);
      }
    }
    function wake() {
      // A running tick schedules its own successor; never start overlapping polls.
      if (controller && !controller.signal.aborted) return;
      clearTimeout(timer);
      timer = setTimeout(tick, 100);
    }
    void tick();
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [initial.id]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    setNotice("");
    try {
      await api.run("thread-send", { conversationId: view.id, body, assetIds: assets });
      setBody("");
      setAssets([]);
      setNotice("Message saved.");
      await load();
      input.current?.focus();
    } catch {}
  }
  async function olderPage() {
    setLoading(true);
    try {
      await load(messages[0]?.sequence ?? 0);
    } catch (e) {
      api.setError(e instanceof Error ? e.message : "Earlier messages unavailable.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="conversation">
      <header className="job-panel">
        <p className="eyebrow">Job conversation · {view.town}</p>
        <h1>{view.title}</h1>
        <p>
          Only this job’s client and invited provider can participate. Keep addresses, identity
          documents and banking details out of chat.
        </p>
        <Link className="text-link" href="/app/inbox">
          All conversations
        </Link>
        {view.bookingId && (
          <Link
            className="text-link"
            href={"/app/" + (view.client ? "client" : "worker") + "/bookings/" + view.bookingId}
          >
            Appointment and work history
          </Link>
        )}
      </header>
      <p className="quote-small" role="status">
        {connection}
      </p>
      {older && (
        <button
          className="button button-outline"
          disabled={loading}
          onClick={() => void olderPage()}
        >
          Load earlier messages
        </button>
      )}
      <ol className="message-list" aria-label="Saved messages" aria-live="off">
        {messages.map((m) => (
          <li key={m.id} className={m.sender === "you" ? "message-own" : "message-other"}>
            <p className="eyebrow">
              {m.sender} · <time dateTime={m.at}>{jobTime(m.at)}</time> · #{m.sequence}
            </p>
            <p className="job-text">{m.body}</p>
            <Evidence assets={m.assets} />
          </li>
        ))}
      </ol>
      {!messages.length && view.canRead && (
        <p>No messages saved yet. Start with a question about the work.</p>
      )}
      {view.canSend ? (
        <form className="job-panel" onSubmit={(e) => void send(e)}>
          <h2>Write a message</h2>
          <label>
            Message
            <textarea
              ref={input}
              required
              maxLength={4000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={api.busy}
            />
          </label>
          <EvidenceUpload
            target={{ purpose: "message", conversationId: view.id }}
            value={assets}
            onChange={setAssets}
            onBusyChange={setUploading}
            disabled={api.busy}
          />
          <button
            className="button button-primary"
            disabled={api.busy || uploading || !body.trim()}
          >
            {api.busy ? "Saving…" : "Send message"}
          </button>
        </form>
      ) : (
        <p className="job-notice">
          {view.blocked || view.reported
            ? "Messages are paused by a block or pending safety report."
            : "This conversation is read-only or your current permission has ended."}
        </p>
      )}
      {api.error && (
        <p role="alert" className="form-error">
          {api.error} Your draft is kept for an explicit retry.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <SafetyForm thread={view} reload={() => load().then(() => {})} />
    </div>
  );
}
