import type { Metadata } from 'next';
import { ServiceBrowse } from '@/components/service-browse';

export const metadata: Metadata = { title: 'Service categories' };

export default function ServicesPage() {
  return (
    <section className="shell inner-page">
      <p className="eyebrow">EXPLORE WHAT'S POSSIBLE</p>
      <h1 className="inner-heading">Your home. Your to-do list.<br /><em>Our starting point.</em></h1>
      <p className="inner-lede">Browse the categories we're preparing for our first local pilot. Live provider profiles and booking will appear only after workers have been reviewed.</p>
      <ServiceBrowse />
    </section>
  );
}
