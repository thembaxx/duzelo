import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <Link href="/" className="footer-brand">Duzelo<span>.</span></Link>
          <p>Good help, close to home.</p>
          <p className="footer-note">A local-services marketplace in development. No workers or bookings are live yet.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/services">Services</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/trust">Trust & safety</Link>
          <Link href="/settings">Appearance</Link>
        </nav>
      </div>
      <div className="shell footer-bottom"><span>© {new Date().getUTCFullYear()} Duzelo · Working name</span><span>Designed for South Africa</span></div>
    </footer>
  );
}
