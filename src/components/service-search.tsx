export function ServiceSearch({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form method="GET" action="/explore" className="service-search" role="search">
      <label htmlFor="service-search-input" className="sr-only">Search for a service</label>
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor"
        strokeWidth="1.8" aria-hidden="true">
        <circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.6 4.6" strokeLinecap="round" />
      </svg>
      <input id="service-search-input" name="q" type="search" defaultValue={defaultValue}
        autoComplete="off" placeholder="What do you need help with?" />
      <button type="submit">Find a service <span aria-hidden>↗</span></button>
    </form>
  );
}
