import Link from "next/link";
export function JobsNavigation({ worker = false }: { worker?: boolean }) {
  return (
    <nav aria-label={worker ? "Worker requests" : "Client requests"} className="job-actions">
      <Link href={worker ? "/app/worker" : "/app/client"} className="text-link">
        Account workspace
      </Link>
      <Link href={worker ? "/app/worker/opportunities" : "/app/client/jobs"} className="text-link">
        {worker ? "Opportunities" : "My requests"}
      </Link>
      {!worker && (
        <Link href="/app/client/jobs/new" className="text-link">
          New request
        </Link>
      )}
    </nav>
  );
}
export function JobsClosed({ worker = false }: { worker?: boolean }) {
  return (
    <section className="empty-panel">
      <h2>Job requests are not open yet.</h2>
      <p>This capability is awaiting release configuration.</p>
      <Link href={worker ? "/app/worker" : "/app/client"} className="text-link">
        Back to your account
      </Link>
    </section>
  );
}
