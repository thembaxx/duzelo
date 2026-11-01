import { workerConfig } from "@/features/workers/config";
import { jobsConfig } from "@/features/jobs/config";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicWorkers } from "@/features/workers/queries";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reviewed worker profile" };
const rand = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
export default async function WorkerProfile({ params }: { params: Promise<{ slug: string }> }) {
  const [worker] = await publicWorkers((await params).slug);
  if (!worker) notFound();
  const avatar = worker.media.find((m) => m.kind === "avatar");
  return (
    <section className="shell inner-page">
      <Link href="/workers" className="text-link">
        Back to worker profiles
      </Link>
      <p className="eyebrow">{worker.town} · approximate public area</p>
      <h1 className="inner-heading">{worker.name}</h1>
      {workerConfig()?.mode === "local" && (
        <p className="test-notice">
          Isolated local test profile. This is not a live worker listing.
        </p>
      )}
      {avatar && (
        <Image
          className="worker-avatar"
          unoptimized
          src={"/api/v1/workers/media/" + avatar.id}
          alt={avatar.caption || worker.name + " profile photo"}
          width={180}
          height={180}
        />
      )}
      <p className="inner-lede">{worker.bio}</p>
      <div className="review-badges">
        <span>Identity reviewed</span>
        {worker.businessReviewed && <span>Business reviewed</span>}
      </div>
      <h2>Services and category reviews</h2>
      <ul className="published-services">
        {worker.services.map((service) => (
          <li key={service.id}>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <p>
              {worker.categories.find((c) => c.id === service.categoryId)?.label}
              {worker.categories.find((c) => c.id === service.categoryId)?.tradeReviewed
                ? " · Trade credential reviewed"
                : ""}
            </p>
            <strong>
              {service.priceCents === null
                ? "Price after a custom quote"
                : (service.pricing === "from" ? "From " : "") + rand(service.priceCents)}
            </strong>
          </li>
        ))}
      </ul>
      <p>
        {worker.travelFeeCents
          ? "Possible travel fee: " + rand(worker.travelFeeCents)
          : "No travel fee is advertised."}
      </p>
      <h2>Reviewed portfolio</h2>
      {worker.media.some((m) => m.kind === "portfolio") ? (
        <div className="worker-portfolio">
          {worker.media
            .filter((m) => m.kind === "portfolio")
            .map((m) => (
              <figure key={m.id}>
                <Image
                  unoptimized
                  src={"/api/v1/workers/media/" + m.id}
                  width={640}
                  height={480}
                  alt={m.caption || "Reviewed work portfolio photo"}
                />
                {m.caption && <figcaption>{m.caption}</figcaption>}
              </figure>
            ))}
        </div>
      ) : (
        <p>No portfolio photographs have been published.</p>
      )}
      <section className="standout-panel">
        <h2>{jobsConfig() ? "Request help from this provider." : "Booking is not open yet."}</h2>
        <p>
          Listed prices describe the worker's proposed services. Scope, materials and any travel
          fees must be agreed before work begins. No payment or service request is created by
          viewing this profile.
        </p>
        {jobsConfig() && (
          <Link
            href={
              "/app/client/jobs/new?worker=" + worker.slug + "&category=" + worker.categories[0]!.id
            }
            className="button button-primary"
          >
            Start a direct service request
          </Link>
        )}
        {jobsConfig() && (
          <p>
            Only this provider will be invited if currently eligible. No appointment or payment is
            created. Quotes and bookings are not open yet.
          </p>
        )}
      </section>
    </section>
  );
}
