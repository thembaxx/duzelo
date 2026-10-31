import Link from 'next/link';
import { HeroIntro } from '@/components/hero-intro';
import { ServiceSearch } from '@/components/service-search';
import { CategoryCard } from '@/components/category-card';
import { serviceCategories } from '@/lib/services';

export default function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-ambient" aria-hidden="true"><div className="ambient-orbit orbit-one" /><div className="ambient-orbit orbit-two" /></div>
        <div className="shell hero-shell">
          <HeroIntro>
            <div className="hero-eyebrow" data-intro><span className="eyebrow-dot" /> YOUR NEIGHBOURHOOD, YOUR PEOPLE</div>
            <h1 data-intro>Good help, <em>close</em><br className="desktop-break" /> to home<span className="highlight-period">.</span></h1>
            <p className="hero-description" data-intro>A simpler way to find help for the things that matter. Built around local connections, clear expectations and trust.</p>
            <div className="hero-search-wrap" data-intro><ServiceSearch /></div>
            <p className="hero-disclaimer" data-intro>We’re preparing a launch in the Piet Retief / Mkhondo area. Bookings aren’t open yet.</p>
          </HeroIntro>
          <div className="hero-lower" aria-hidden="true"><span>LOCAL SUPPORT. REAL CONNECTIONS.</span><span>01 — 03</span></div>
        </div>
      </section>

      <section className="section service-section shell" aria-labelledby="service-heading">
        <div className="section-heading">
          <div><p className="eyebrow">WHAT YOU NEED, NEARBY</p><h2 id="service-heading">A helping hand for<br /><em>everyday life.</em></h2></div>
          <p>From a small repair to bigger projects, start with the right category. We’ll introduce verified local professionals when the marketplace is ready.</p>
        </div>
        <div className="category-grid">{serviceCategories.slice(0, 4).map((category) => <CategoryCard key={category.slug} category={category} />)}</div>
        <Link href="/services" className="text-link">See all service categories <span aria-hidden>↗</span></Link>
      </section>

      <section className="section story-section" aria-labelledby="story-heading">
        <div className="shell story-layout">
          <div className="story-mark" aria-hidden="true"><span className="story-center">D.</span><span className="story-ring ring-a" /><span className="story-ring ring-b" /></div>
          <div className="story-copy">
            <p className="eyebrow">BUILT ON TRUST</p>
            <h2 id="story-heading">Neighbourly at heart. <em>Thoughtful</em> by design.</h2>
            <p>We believe finding local help should feel straightforward. Duzelo is being built around private addresses, reviewed worker credentials and clear booking steps—not vague promises.</p>
            <Link href="/how-it-works" className="button button-light">See how it will work <span aria-hidden>↗</span></Link>
          </div>
        </div>
      </section>

      <section className="section process-section shell" aria-labelledby="process-heading">
        <div className="section-heading"><div><p className="eyebrow">THE DUZELO WAY</p><h2 id="process-heading">Less searching.<br /><em>More certainty.</em></h2></div><p>A marketplace designed to give you confidence at every step. These features are in development.</p></div>
        <ol className="steps-grid">
          <li><span className="step-count">01</span><h3>Tell us what you need</h3><p>Describe your task, choose your timing and keep your exact address private until it’s needed.</p></li>
          <li><span className="step-count">02</span><h3>Review your options</h3><p>Discover category-verified workers and compare clear quotes when matching is available.</p></li>
          <li><span className="step-count">03</span><h3>Keep track easily</h3><p>Follow updates and communicate through a secure booking experience when launched.</p></li>
        </ol>
      </section>
      <section className="closing-cta shell"><div><p className="eyebrow">GOOD HELP STARTS HERE</p><h2>A better way to get things <em>done.</em></h2></div><Link href="/explore" className="button button-primary">Explore categories <span aria-hidden>↗</span></Link></section>
    </>
  );
}
