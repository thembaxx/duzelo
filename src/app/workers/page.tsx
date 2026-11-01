import Link from "next/link";
import { publicWorkers } from "@/features/workers/queries";
import { workerConfig } from "@/features/workers/config";
export const dynamic = "force-dynamic";
export const metadata = { title: "Worker profiles" };
export default async function WorkersDirectory() {
  const config = workerConfig();
  const enabled = Boolean(config),
    workers = enabled ? await publicWorkers() : [];
  return (
    <section className="shell inner-page">
      <p className="eyebrow">Local worker profiles</p>
      <h1 className="inner-heading">
        People behind <em>the work.</em>
      </h1>
      <p className="inner-lede">
        Only profiles with completed manual review can appear here. Trade credentials are reviewed
        for individual categories. Booking and location search are not open yet.
      </p>
      {config?.mode === "local" && (
        <p className="test-notice">
          Isolated local testing. These profiles are fictional test records, not live workers.
        </p>
      )}
      {!enabled ? (
        <div className="standout-panel">
          <h2>Profiles are not open yet.</h2>
          <p>
            Private onboarding and manual review are still awaiting release configuration. No worker
            is presented as available.
          </p>
          <Link className="button button-primary" href="/services">
            Explore service categories
          </Link>
        </div>
      ) : workers.length ? (
        <ul className="published-workers">
          {workers.map((w) => (
            <li key={w.slug}>
              <h2>
                <Link href={"/workers/" + w.slug}>{w.name}</Link>
              </h2>
              <p>{w.town}</p>
              <p>{w.bio}</p>
              <p>Identity reviewed{w.businessReviewed ? " · Business reviewed" : ""}</p>
              <ul>
                {w.categories.map((c) => (
                  <li key={c.id}>
                    {c.label}
                    {c.tradeReviewed ? " · Trade credential reviewed" : ""}
                  </li>
                ))}
              </ul>
              <Link className="button button-secondary" href={"/workers/" + w.slug}>
                View {w.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="standout-panel">
          <h2>No reviewed profiles to show.</h2>
          <p>Submitted applications appear only after the required review is complete.</p>
        </div>
      )}
    </section>
  );
}
