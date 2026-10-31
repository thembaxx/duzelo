import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  ShieldCheck,
  LockKeyhole,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { getMessages } from "@/locales";
import { CategoryGrid } from "@/features/services/category-grid";

export default function HomePage() {
  const t = getMessages().home;
  return (
    <>
      <div className="welcome-line">
        <h1>{t.greeting}</h1>
        <span className="status-pill">
          <span className="status-dot" />
          {t.pilot}
        </span>
      </div>
      <div className="home-grid">
        <section className="hero" aria-labelledby="home-tagline">
          <div className="hero-orbit" aria-hidden="true" />
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="home-tagline">{brand.tagline}</h2>
          <p>{t.intro}</p>
          <div className="hero-actions">
            <Link href="/services" className={buttonVariants()}>
              {t.browse}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/how-it-works#workers" className={buttonVariants({ variant: "secondary" })}>
              {t.worker}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <aside className="local-note">
          <MapPin size={28} strokeWidth={1.2} aria-hidden="true" />
          <p className="eyebrow">{t.areaLabel}</p>
          <h2>
            Big on community.
            <br />
            Local by nature.
          </h2>
          <p>We’re building for {brand.area} and the communities around it.</p>
          <span className="note-footer">
            <span aria-hidden="true">↳</span>
            {brand.province}
          </span>
        </aside>
      </div>
      <section aria-labelledby="services-title">
        <div className="section-heading">
          <div>
            <h2 id="services-title">{t.servicesTitle}</h2>
            <p>{t.servicesDescription}</p>
          </div>
          <Link href="/services" className="text-link">
            View all <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <CategoryGrid preview />
      </section>
      <div className="home-bottom">
        <section className="principles" aria-labelledby="principles-title">
          <h2 id="principles-title">A thoughtful way to find help.</h2>
          <div className="principle-row">
            <ShieldCheck size={19} aria-hidden="true" />
            <p>
              <strong>People before profiles</strong>Manual worker review is required before
              listings can go live.
            </p>
          </div>
          <div className="principle-row">
            <LockKeyhole size={19} aria-hidden="true" />
            <p>
              <strong>Your address stays private</strong>Exact locations will never be part of
              public listings.
            </p>
          </div>
          <div className="principle-row">
            <MessageSquare size={19} aria-hidden="true" />
            <p>
              <strong>Agree before the work begins</strong>The planned flow puts scope, quotes and
              confirmation first.
            </p>
          </div>
          <Link href="/trust" className="text-link">
            Our approach to trust <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <section className="worker-note">
          <Wrench size={23} strokeWidth={1.5} aria-hidden="true" />
          <h2>Good at what you do?</h2>
          <p>
            There’s a place for individual tradespeople and local service businesses in the planned
            pilot.
          </p>
          <Link href="/how-it-works#workers" className="text-link">
            Learn about offering services <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </>
  );
}
