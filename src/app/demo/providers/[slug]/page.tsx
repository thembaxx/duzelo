import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChatCircle, Clock, MapPin, Star } from "@phosphor-icons/react/dist/ssr";
import { categoryName, demoProviders, findDemoProvider } from "@/features/demo/catalogue";
import { BookingForm } from "@/features/demo/booking-form.client";

export function generateStaticParams() {
  return demoProviders.map((p) => ({ slug: p.slug }));
}
export default async function DemoProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = findDemoProvider((await params).slug);
  if (!p) notFound();
  return (
    <div className="demo-shell demo-detail-page demo-enter">
      <Link href="/demo" className="demo-back">
        <ArrowLeft size={17} aria-hidden="true" /> Back to your neighbourhood
      </Link>
      <div className="demo-provider-gallery">
        <div>
          <Image
            src={`/demo/${p.photo}.webp`}
            alt={p.photoAlt}
            fill
            priority
            sizes="(max-width: 700px) 100vw, 65vw"
          />
        </div>
        <div>
          <Image
            src="/demo/home.webp"
            alt="Illustrative stock photo of a comfortable living room"
            fill
            sizes="35vw"
          />
        </div>
        <span>Service inspiration · stock photography, not this provider’s work</span>
      </div>
      <div className="demo-detail-layout">
        <div className="demo-detail-copy">
          <div className="demo-provider-profile">
            <span
              className={`demo-avatar demo-avatar-large demo-avatar-${p.accent}`}
              aria-hidden="true"
            >
              {p.initials}
            </span>
            <div>
              <p className="demo-kicker">
                FICTIONAL PROVIDER · {categoryName(p.category).toUpperCase()}
              </p>
              <h1>{p.name}</h1>
              <p>
                {p.person} · {p.area}
              </p>
            </div>
          </div>
          <div className="demo-profile-facts">
            <span>
              <Star weight="fill" size={17} aria-hidden="true" />
              <strong>{p.rating}</strong> ({p.reviews} sample reviews)
            </span>
            <span>
              <Clock size={17} aria-hidden="true" />
              {p.experience} example experience
            </span>
            <span>
              <MapPin size={17} aria-hidden="true" />
              Approximate area only
            </span>
          </div>
          <section className="demo-profile-section">
            <p className="demo-kicker">THE PERSON BEHIND THE TOOLS</p>
            <h2>{p.headline}</h2>
            <p>{p.bio}</p>
            <p className="demo-languages">
              <ChatCircle size={19} aria-hidden="true" /> {p.languages.join(" · ")}
            </p>
            <div className="demo-soft-note">
              This profile, its experience and its ratings are fictional. No identity, qualification
              or background approval is claimed.
            </div>
          </section>
          <section className="demo-profile-section" aria-labelledby="demo-review-heading">
            <p className="demo-kicker">LITTLE DETAILS, BIG DIFFERENCE</p>
            <h2 id="demo-review-heading">Kind words, in the demo.</h2>
            <p>Three fictional review excerpts, shown to explore the product experience.</p>
            <div className="demo-review-list">
              {[
                [
                  "NM",
                  "Nandi M.",
                  "The scope was clear, the little details were taken care of, and the space was left tidy. Exactly the sort of help I had in mind.",
                ],
                [
                  "SD",
                  "Sam D.",
                  "Easy to plan around my day. I liked knowing what was included before the visit.",
                ],
                [
                  "PN",
                  "Palesa N.",
                  "A friendly update before arriving and a useful summary afterwards. I’d save this provider for the next job.",
                ],
              ].map(([initials, name, body]) => (
                <article key={name}>
                  <span className="demo-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <div>
                    <strong>
                      {name} <small>· Sample review</small>
                    </strong>
                    <span className="demo-review-stars" aria-label="5 out of 5 sample stars">
                      ★★★★★
                    </span>
                    <p>{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside>
          <BookingForm provider={p} />
        </aside>
      </div>
    </div>
  );
}
