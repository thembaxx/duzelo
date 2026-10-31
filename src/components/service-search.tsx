import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';

export function ServiceSearch({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/explore" className="service-search" role="search">
      <label htmlFor="service-search-input" className="sr-only">Search for a service</label>
      <MagnifyingGlass size={21} aria-hidden="true" />
      <input id="service-search-input" name="q" type="search" defaultValue={defaultValue}
        autoComplete="off" placeholder="Try plumbing, painting, cleaning…" />
      <button type="submit">Find a service <ArrowRight size={17} aria-hidden="true" /></button>
    </form>
  );
}
