import Link from 'next/link';
import { ArrowUpRight, CalendarBlank, MapPinLine } from '@phosphor-icons/react/dist/ssr';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import type { DemoRequest } from '@/lib/demo-requests';

export function DemoRequestCard({ request, index }: { request: DemoRequest; index: number }) {
  return (
    <SpotlightCard className="demo-scenario-card">
      <article className="demo-scenario-content">
        <div className="scenario-topline">
          <span className="scenario-category">{request.category}</span>
          <span className="scenario-index">CASE {String(index + 1).padStart(2, '0')}</span>
        </div>
        <h3>{request.title}</h3>
        <p>{request.brief}</p>
        <div className="scenario-meta">
          <span><MapPinLine size={16} aria-hidden="true" />{request.town}</span>
          <span><CalendarBlank size={16} aria-hidden="true" />{request.timeline}</span>
        </div>
        <div className="scenario-bottom">
          <span>{request.exampleBudget}</span>
          <Link href={'/services/' + request.categorySlug} aria-label={'Explore ' + request.category + ' category'}>
            <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </SpotlightCard>
  );
}
