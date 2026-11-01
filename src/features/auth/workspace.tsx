import { workerConfig } from "@/features/workers/config";
import { jobsConfig } from "@/features/jobs/config";
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
            ? jobsConfig()
              ? "Your account is ready. Save a private request and invite eligible workers. Bookings and payments are not open."
              : "Your account is ready. Job requests and bookings are not open yet."
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
            : workerConfig()
              ? "Complete your profile and evidence for manual review. Account setup does not verify identity or trade credentials."
              : "Worker profile setup is awaiting release configuration. Account setup does not verify identity or trade credentials."}
        </p>
        <nav aria-label="Account navigation" className="inline-actions">
          <Link href="/app/settings" className={buttonVariants()}>
            Account settings
          </Link>
          {jobsConfig() && (
            <>
              <Link
                href={mode === "client" ? "/app/client/jobs" : "/app/worker/opportunities"}
                className={buttonVariants({ variant: "outline" })}
              >
                {mode === "client" ? "My requests" : "Work opportunities"}
              </Link>
              {mode === "client" && (
                <Link
                  href="/app/client/jobs/new"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Start a job request
                </Link>
              )}
            </>
          )}
          {!(mode === "client" ? actor.profile?.worker_enabled : actor.profile?.client_enabled) && (
            <Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>
              Add {mode === "client" ? "worker" : "client"} mode
            </Link>
          )}
          {mode === "worker" && workerConfig() && (
            <>
              <Link
                href="/app/worker/onboarding"
                className={buttonVariants({ variant: "outline" })}
              >
                Set up worker profile
              </Link>
              <Link
                href="/app/worker/verification"
                className={buttonVariants({ variant: "outline" })}
              >
                Verification status
              </Link>
            </>
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
