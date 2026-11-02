"use client";
import { useRouter } from "next/navigation";
import { useCollaboration } from "@/features/collaboration/client-api";
export function OpenConversation({ quoteId }: { quoteId: string }) {
  const api = useCollaboration(),
    router = useRouter();
  async function open() {
    try {
      const r = await api.run("thread-open", { quoteId });
      router.push("/app/inbox/" + r.conversationId);
    } catch {}
  }
  return (
    <div>
      <button className="button button-secondary" disabled={api.busy} onClick={() => void open()}>
        Open job conversation
      </button>
      {api.error && <p role="alert">{api.error}</p>}
    </div>
  );
}
