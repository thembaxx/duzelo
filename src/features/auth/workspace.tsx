import Link from "next/link";
import { requireWorkspace } from "./guard";
import { PageHeading } from "@/features/auth/page-heading";
import { SignOutButton } from "./forms.client";
import { buttonVariants } from "@/features/auth/button";
export async function WorkspacePage({ mode }: { mode: "client" | "worker" }) {
  const actor = await requireWorkspace(mode);
  return (
    <>
      <nav aria-label="Account mode" className="mode-switch">
        {actor.profile?.client_enabled && (
          <Link
            href="/app/client"
            aria-label={mode === "worker" ? "Switch to client" : "Client mode"}
            aria-current={mode === "client" ? "page" : undefined}
          >
            Find help
          </Link>
        )}
        {actor.profile?.worker_enabled && actor.profile.client_enabled ? (
          <Link
            href="/app/worker"
            aria-label={mode === "client" ? "Switch to worker" : "Worker mode"}
            aria-current={mode === "worker" ? "page" : undefined}
          >
            Offer services
          </Link>
        ) : mode === "worker" ? (
          <Link href="/app/worker" aria-current="page">
            Offer services
          </Link>
        ) : null}
      </nav>
      <PageHeading
        eyebrow={`${mode === "client" ? "Client" : "Worker"} mode`}
        title={`Welcome, ${actor.profile?.display_name ?? "neighbour"}.`}
      >
        <p>
          {mode === "client"
            ? "Your account is ready. Job requests and bookings are not open yet."
            : `Worker profile: ${actor.workerStatus ?? "not started"}. Manual review is required before publication or opportunities.`}
        </p>
      </PageHeading>
      <section className="empty-panel">
        <h2>
          {mode === "client"
            ? "Your next chapter starts here."
            : "Your skills. Your future workspace."}
        </h2>
        <p>
          {mode === "client"
            ? "Explore the planned services while the local pilot takes shape."
            : "Verification, services and opportunities will open in later releases. Account setup does not verify identity or trade credentials."}
        </p>
        <nav aria-label="Account navigation" className="inline-actions">
          <Link href="/app/settings" className={buttonVariants()}>
            Account settings
          </Link>
          {!(mode === "client" ? actor.profile?.worker_enabled : actor.profile?.client_enabled) && (
            <Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>
              Add {mode === "client" ? "worker" : "client"} mode
            </Link>
          )}
          <Link href="/services" className={buttonVariants({ variant: "outline" })}>
            Explore services
          </Link>
        </nav>
      </section>
      <div className="inline-actions">
        <SignOutButton />
      </div>
    </>
  );
}
