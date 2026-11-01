import Link from "next/link";
import { database } from "@/lib/db/server";
import { quoteActor } from "./policy";
import { jobTime } from "@/features/jobs/format";
export async function AgreementNotices({ worker = false }: { worker?: boolean }) {
  const actor = await quoteActor(worker);
  const notices =
    await database()`select id,title,body,href,created_at from public.notifications where user_id=${actor.id}::uuid and kind in ('quote-submitted','quote-withdrawn','quote-not-selected','booking-requested','booking-pending','booking-confirmed','booking-declined','booking-cancelled','inspection-authorized','inspection-revoked','request-cancelled') order by created_at desc,id desc limit 20`;
  return (
    <details className="job-panel">
      <summary>Recent agreement notices</summary>
      {notices.length ? (
        <ul className="job-record-list">
          {notices.map((n) => (
            <li key={String(n.id)}>
              <strong>{String(n.title)}</strong>
              <p>
                {String(n.body)} · {jobTime(new Date(n.created_at).toISOString())}
              </p>
              <Link className="text-link" href={String(n.href)}>
                Review update
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No agreement notices yet.</p>
      )}
      <p>
        Notices are a history. Open the saved agreement to check current status and permission. No
        SMS, email or push was sent.
      </p>
    </details>
  );
}
