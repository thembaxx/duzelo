import type { Metadata } from "next";
import { ArrowClockwise, WifiSlash, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <section className="shell inner-page narrow-page offline-page">
      <div className="offline-symbol">
        <WifiSlash size={38} aria-hidden="true" />
      </div>
      <p className="eyebrow">CONNECTION PAUSED</p>
      <h1 className="inner-heading">
        A little offline.
        <br />
        <em>Still close to home.</em>
      </h1>
      <p className="inner-lede">
        There’s no connection right now. Public pages saved earlier may still be available. Private
        information, sign-in and bookings are never served from an offline cache.
      </p>
      <div className="offline-actions">
        <a href="/" className="button button-primary">
          <ArrowClockwise size={18} aria-hidden="true" /> Try again
        </a>
        <a href="/services" className="button button-outline">
          <ArrowLeft size={18} aria-hidden="true" /> Saved categories
        </a>
      </div>
    </section>
  );
}
