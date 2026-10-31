import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
export const metadata: Metadata = { title: 'Sign-in coming soon', robots: { index: false, follow: false } };
export default function SignInPage() {
  return <section className="shell inner-page narrow-page">
    <p className="eyebrow">ACCOUNT ACCESS</p><h1 className="inner-heading">We're not quite <em>ready.</em></h1>
    <p className="inner-lede">Phone sign-in is not enabled in this foundation release. We’re building secure verification and privacy protections before opening accounts or accepting bookings.</p>
    <div className="standout-panel"><h2>What can I do now?</h2><p>Explore categories and how Duzelo is planned to work—no account required.</p><Link href="/services" className="button button-primary">Explore services <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
  </section>;
}
