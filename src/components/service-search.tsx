import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

export function ServiceSearch({
  defaultValue = "",
  demo = false,
}: {
  defaultValue?: string;
  demo?: boolean;
}) {
  return (
    <form
      method="GET"
      action={demo ? "/demo" : "/explore"}
      className="service-search"
      role="search"
    >
      <label htmlFor="service-search-input" className="sr-only">
        Search for a service
      </label>
      <MagnifyingGlass size={21} aria-hidden="true" />
      <input
        id="service-search-input"
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoComplete="off"
        placeholder="Search local services"
      />
      <button type="submit">
        {demo ? "Find a service · demo" : "Find a service"}{" "}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
