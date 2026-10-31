import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'How it will work' };
const steps = [
  ['Tell us what you need', 'Choose a category, describe your task, and set your preferred time. Exact addresses stay private.'],
  ['Find the right local help', 'When launched, eligible, manually reviewed workers can receive invitations and send itemised quotes.'],
  ['Agree, track and finish', 'Choose a quote, confirm the booking, message safely and review the completed job.'],
];

export default function HowItWorksPage() {
  return <section className="shell inner-page">
    <p className="eyebrow">THE JOURNEY</p>
    <h1 className="inner-heading">A clearer path from<br /><em>to-do to done.</em></h1>
    <p className="inner-lede">Here's what we're building. These steps describe the planned service, not features you can book with today.</p>
    <ol className="walkthrough-list">{steps.map(([title,description],index)=><li key={title}><span>0{index+1}</span><div><h2>{title}</h2><p>{description}</p></div></li>)}</ol>
    <div className="standout-panel"><h2>Good help should feel good to organise.</h2><p>We're starting with honest expectations, privacy and simple experiences for every phone.</p><Link href="/services" className="text-link">Explore services ↗</Link></div>
  </section>;
}
