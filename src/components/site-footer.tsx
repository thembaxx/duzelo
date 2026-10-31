import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <Link href="/" className="footer-brand">
            <BrandMark size={38} />
            <span>
              Duzelo<span>.</span>
            </span>
          </Link>
          <p>A little help. A lot closer.</p>
          <p className="footer-note">
            A local-services marketplace in development. Worker profiles require manual review.
            Bookings are not open yet.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/services">Services</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/workers">Worker profiles</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/trust">Trust & safety</Link>
          <Link href="/settings">Appearance</Link>
        </nav>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getUTCFullYear()} Duzelo · Working name</span>
        <span>Designed for South Africa</span>
      </div>
    </footer>
  );
}
