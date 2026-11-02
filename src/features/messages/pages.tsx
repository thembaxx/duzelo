import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireIdentity } from "@/features/auth/guard";
import { workflowConfig } from "@/features/collaboration/config";
import { PageHeading } from "@/features/auth/page-heading";
import { jobTime } from "@/features/jobs/format";
import { inbox, threadView } from "./queries";
import { Conversation } from "./thread.client";
async function guard() {
  const a = await requireIdentity();
  if (
    !a.profile?.onboarding_completed_at ||
    !(a.profile.client_enabled || a.profile.worker_enabled)
  )
    redirect("/onboarding");
  return a;
}
export async function InboxPage() {
  const actor = await guard();
  if (!workflowConfig()) return <Closed />;
  const threads = await inbox();
  return (
    <>
      <PageHeading eyebrow="Private job conversations" title="Keep the details together.">
        <p>
          Each conversation belongs to a genuine job and one provider. Updates are checked while
          this tab is online and visible.
        </p>
      </PageHeading>
      <Link
        className="text-link"
        href={actor.profile?.client_enabled ? "/app/client" : "/app/worker"}
      >
        Account workspace
      </Link>
      <ul className="job-record-list">
        {threads.map((t) => (
          <li key={t.id}>
            <h2>
              <Link href={"/app/inbox/" + t.id}>{t.title}</Link>
            </h2>
            <p>
              {t.town} · Updated {jobTime(t.at)}
            </p>
          </li>
        ))}
      </ul>
      {!threads.length && (
        <section className="empty-panel">
          <h2>No job conversations yet.</h2>
          <p>Open a conversation from a sent quote or a selected appointment.</p>
        </section>
      )}
    </>
  );
}
function Closed() {
  return (
    <section className="empty-panel">
      <h1>Messaging and work progress are not open yet.</h1>
      <p>This capability awaits release configuration.</p>
    </section>
  );
}
export async function ThreadPage({ id }: { id: string }) {
  await guard();
  if (!workflowConfig()) return <Closed />;
  if (!z.guid().safeParse(id).success) notFound();
  const view = await threadView(id).catch((e) => {
    if (e instanceof Error && e.message === "FORBIDDEN") notFound();
    throw e;
  });
  return <Conversation initial={view} />;
}
