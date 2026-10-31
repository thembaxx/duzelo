import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  MapPinLine,
  ShieldCheck,
  Sparkle,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import { HeroIntro } from "@/components/hero-intro";
import { ServiceSearch } from "@/components/service-search";
import { CategoryCard } from "@/components/category-card";
import { DemoRequestCard } from "@/components/demo-request-card";
import { BrandMark } from "@/components/brand-mark";
import { serviceCategories } from "@/lib/services";
import { demoRequests } from "@/lib/demo-requests";

export default function HomePage() {
  return (
    <>
      <section className="hero-section editorial-hero">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="shell editorial-hero-layout">
          <HeroIntro>
            <div className="hero-eyebrow" data-intro>
              <span className="eyebrow-dot" /> THE NEIGHBOURHOOD SERVICE DESK
            </div>
            <h1 data-intro>
              A little help.
              <br />
              <em>A lot</em> <span className="word-underline">closer.</span>
            </h1>
            <p className="hero-description" data-intro>
              From the tap that drips to the garden that needs love. Discover the right kind of help
              for real life, right where you live.
            </p>
            <div className="hero-search-wrap" data-intro>
              <ServiceSearch />
            </div>
            <div className="hero-quick-links" data-intro>
              <span>Popular searches</span>
              <Link href="/explore?q=plumbing">
                Plumbing <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <Link href="/explore?q=cleaning">
                Cleaning <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <Link href="/explore?q=gardening">
                Gardening <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </div>
            <div className="hero-launch-note" data-intro>
              <span className="launch-note-symbol">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>Previewing in Mkhondo.</strong> Service bookings and real provider
                verification are not live yet.
              </span>
            </div>
          </HeroIntro>
          <div className="hero-editorial-panel" aria-label="Illustrative service request preview">
            <div className="hero-panel-top">
              <span>
                <Sparkle size={16} aria-hidden="true" /> A clearer way to get it done
              </span>
              <span>DEMO / 01</span>
            </div>
            <div className="hero-panel-canvas">
              <div className="orbital-line orbital-one" />
              <div className="orbital-line orbital-two" />
              <div className="floating-icon floating-icon-a">
                <Wrench size={32} weight="duotone" aria-hidden="true" />
              </div>
              <div className="floating-icon floating-icon-b">
                <MapPinLine size={30} weight="duotone" aria-hidden="true" />
              </div>
              <div className="floating-project">
                <div className="project-smalltop">
                  <span className="preview-dot" /> EXAMPLE REQUEST <span>01 / 03</span>
                </div>
                <h2>
                  Fix a leaky
                  <br />
                  <em>kitchen tap.</em>
                </h2>
                <p>Plumbing · Flexible timing</p>
                <div className="project-progress" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="preview-privacy">
                  <ShieldCheck size={16} aria-hidden="true" /> Address kept private
                </div>
              </div>
            </div>
            <div className="hero-panel-bottom">
              <BrandMark size={22} />
              <span>Thoughtful help starts with a clearer request.</span>
              <span>DUZELO / PREVIEW</span>
            </div>
          </div>
        </div>
        <div className="shell editorial-bottom-strip">
          <span>
            <MapPinLine size={15} aria-hidden="true" /> SOUTH AFRICA · FIRST PILOT: MKHONDO
          </span>
          <Link href="#browse">
            EXPLORE THE CATEGORIES <ArrowDown size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        className="section service-section shell"
        id="browse"
        aria-labelledby="service-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / FIND YOUR STARTING POINT</p>
            <h2 id="service-heading">
              Everything begins
              <br />
              with a <em>little help.</em>
            </h2>
          </div>
          <p>
            A category for the everyday jobs that keep a home moving. Explore what's planned, with
            no pressure to book before we're ready.
          </p>
        </div>
        <div className="category-grid">
          {serviceCategories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
        <Link href="/services" className="text-link">
          Browse all services <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className="section demo-section" aria-labelledby="demo-heading">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / HOW IT COMES TOGETHER</p>
              <h2 id="demo-heading">
                Every job has
                <br />
                <em>a story.</em>
              </h2>
            </div>
            <p>
              These are <strong>fictional preview scenarios</strong>, showing how real requests
              could be described. Budgets are illustrative, not quotes or offers.
            </p>
          </div>
          <div className="demo-strip-label">
            <span className="demo-label-dot" /> INTERACTIVE PRODUCT DEMO{" "}
            <span>NO LIVE BOOKINGS OR PROVIDERS</span>
          </div>
          <div className="demo-grid">
            {demoRequests.map((request, index) => (
              <DemoRequestCard key={request.id} request={request} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="section story-section" aria-labelledby="story-heading">
        <div className="shell story-layout">
          <div className="story-mark" aria-hidden="true">
            <div className="story-center">
              <BrandMark size={150} />
            </div>
            <span className="story-ring ring-a" />
            <span className="story-ring ring-b" />
          </div>
          <div className="story-copy">
            <p className="eyebrow">03 / A BETTER KIND OF LOCAL</p>
            <h2 id="story-heading">
              Nearby should feel <em>personal.</em> Never uncertain.
            </h2>
            <p>
              Private addresses, genuine verification and clearer job details are at the centre of
              what we're building. No made-up ratings, invented tradespeople or payments dressed up
              as escrow.
            </p>
            <Link href="/trust" className="button button-light">
              Our approach to trust <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section process-section shell" aria-labelledby="process-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">04 / THE FLOW</p>
            <h2 id="process-heading">
              Less back-and-forth.
              <br />
              <em>More peace of mind.</em>
            </h2>
          </div>
          <p>
            Designed around honest progress and clear next steps. These workflows remain in
            development.
          </p>
        </div>
        <ol className="steps-grid">
          <li>
            <span className="step-count">01</span>
            <h3>Start with the task</h3>
            <p>Explain what needs doing, choose a time and keep your home address private.</p>
          </li>
          <li>
            <span className="step-count">02</span>
            <h3>See the right fit</h3>
            <p>Review worker credentials and quotes once service providers have been approved.</p>
          </li>
          <li>
            <span className="step-count">03</span>
            <h3>Stay in the loop</h3>
            <p>Know what's next, from first contact to a finished job, when booking launches.</p>
          </li>
        </ol>
      </section>
      <section className="closing-cta shell">
        <div>
          <p className="eyebrow">YOUR NEIGHBOURHOOD. YOUR NEXT CHAPTER.</p>
          <h2>
            Good things get done <em>together.</em>
          </h2>
        </div>
        <Link href="/how-it-works" className="button button-primary">
          Discover the plan <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </section>
    </>
  );
}
