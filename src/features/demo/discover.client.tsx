"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Drop,
  Hammer,
  Heart,
  Lightning,
  List,
  MagnifyingGlass,
  MapTrifold,
  PaintRoller,
  Plant,
  SlidersHorizontal,
  Sparkle,
  SquaresFour,
  X,
} from "@phosphor-icons/react";
import { demoCategories, filterDemoProviders, type DemoCategory } from "./catalogue";
import { useDemo } from "./store.client";
import { ProviderCard } from "./provider-card";
const DemoMap = dynamic(() => import("./map.client"), {
  ssr: false,
  loading: () => (
    <div className="demo-map-wrap">
      <div className="demo-map-loading" role="status">
        Getting your neighbourhood ready…
      </div>
    </div>
  ),
});
const icons = { SquaresFour, Sparkle, Plant, Drop, Lightning, PaintRoller, Hammer };

export function DemoDiscover({ savedOnly = false }: { savedOnly?: boolean }) {
  const { state } = useDemo();
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const category = demoCategories.some((c) => c.id === params.get("category"))
    ? (params.get("category") as DemoCategory)
    : "all";
  const query = (params.get("q") ?? "").slice(0, 100),
    sort = ["price", "rating"].includes(params.get("sort") ?? "")
      ? params.get("sort")!
      : "recommended";
  const [draft, setDraft] = useState(query),
    [selected, setSelected] = useState<string | null>(null),
    [mapView, setMapView] = useState(false),
    [desktop, setDesktop] = useState(false);
  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width:1000px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const providers = useMemo(
    () => filterDemoProviders(query, category, sort, savedOnly ? (state?.saved ?? []) : undefined),
    [query, category, sort, savedOnly, state?.saved],
  );
  const selection = providers.some((p) => p.slug === selected) ? selected : null;
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all" && value !== "recommended") next.set(key, value);
    else next.delete(key);
    router.replace(pathname + (next.size ? "?" + next.toString() : ""), { scroll: false });
  }
  if (savedOnly && !state)
    return (
      <p className="demo-shell demo-page-loading" role="status">
        Loading your saved sample providers…
      </p>
    );
  return (
    <div className="demo-shell demo-discover">
      {!savedOnly && (
        <section className="demo-welcome demo-enter" aria-labelledby="demo-welcome-title">
          <div className="demo-welcome-copy">
            <p className="demo-kicker">A LITTLE TIME BACK, A LITTLE CLOSER TO HOME.</p>
            <h1 id="demo-welcome-title">
              Good help.
              <br />
              <em>More living.</em>
            </h1>
            <p>
              Find someone for the to-do list.
              <br /> Keep the rest of the day for you.
            </p>
            <Link href="/demo/bookings" className="demo-welcome-link">
              Your week, at a glance <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="demo-welcome-image">
            <Image
              src="/demo/home.webp"
              alt="Illustrative sunlit living room with plants and comfortable seating"
              fill
              priority
              sizes="(max-width: 600px) 100vw, 60vw"
            />
            <span className="demo-photo-caption">
              A little room to slow down. · Illustrative photo
            </span>
          </div>
          <span className="demo-welcome-stamp" aria-hidden="true">
            <Sparkle size={21} />
            <span>
              Good help,
              <br />
              close to home.
            </span>
          </span>
        </section>
      )}
      <div className="demo-discover-heading">
        <div>
          {savedOnly ? (
            <>
              <p className="demo-kicker">YOUR LITTLE BLACK BOOK</p>
              <h1>
                Good people, <em>kept close.</em>
              </h1>
              <p>Sample providers you’ve saved for another day.</p>
            </>
          ) : (
            <>
              <p className="demo-kicker">FIND YOUR KIND OF HELP</p>
              <h2>Around your neighbourhood</h2>
            </>
          )}
        </div>
        <span className="demo-area-pill">
          <span className="demo-live-dot" /> Mkhondo demo
        </span>
      </div>
      <form
        className="demo-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update("q", draft.trim());
        }}
      >
        <label className="sr-only" htmlFor="demo-search">
          Search demo services
        </label>
        <MagnifyingGlass size={21} aria-hidden="true" />
        <input
          id="demo-search"
          type="search"
          maxLength={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What could you use a hand with?"
        />
        <button type="submit">
          Find help <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
      <div className="demo-category-bar" role="group" aria-label="Filter demo service category">
        {demoCategories.map((c) => {
          const Icon = icons[c.symbol];
          return (
            <button
              type="button"
              key={c.id}
              aria-pressed={category === c.id}
              onClick={() => update("category", c.id)}
            >
              <Icon size={22} weight={category === c.id ? "fill" : "regular"} aria-hidden="true" />
              {c.name}
            </button>
          );
        })}
      </div>
      <div className="demo-results-toolbar">
        <p role="status" aria-live="polite">
          <strong>{providers.length}</strong>{" "}
          {savedOnly ? "saved sample providers" : "sample providers"}
          {query && <> for “{query}”</>}
          {category !== "all" && (
            <button
              className="demo-clear"
              onClick={() => update("category", "all")}
              aria-label="Clear category filter"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </p>
        <div>
          <label className="demo-sort">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="sr-only">Sort demo providers</span>
            <select value={sort} onChange={(e) => update("sort", e.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="price">Price: low to high</option>
              <option value="rating">Highest sample rating</option>
            </select>
          </label>
          <div className="demo-view-toggle" role="group" aria-label="Result view">
            <button aria-pressed={!mapView} onClick={() => setMapView(false)}>
              <List size={18} aria-hidden="true" /> List
            </button>
            <button aria-pressed={mapView} onClick={() => setMapView(true)}>
              <MapTrifold size={18} aria-hidden="true" /> Map
            </button>
          </div>
        </div>
      </div>
      <div className={"demo-discovery-layout" + (mapView ? " show-map" : "")}>
        <div className="demo-results-list">
          {providers.length ? (
            <div className="demo-provider-grid">
              {providers.map((p) => (
                <ProviderCard
                  key={p.slug}
                  provider={p}
                  selected={selection === p.slug}
                  onMap={() => {
                    setSelected(p.slug);
                    setMapView(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="demo-empty">
              <Heart size={40} weight="duotone" aria-hidden="true" />
              <h2>
                {savedOnly && !query && category === "all"
                  ? "A little space for your favourites."
                  : "No matches just yet."}
              </h2>
              <p>
                {savedOnly
                  ? "Save a sample provider with the heart on their card, or change your filters."
                  : "Try another service, or clear your filters to see the neighbourhood."}
              </p>
              <Link href="/demo" className="button button-primary">
                Explore all sample providers
              </Link>
            </div>
          )}
        </div>
        <aside className="demo-map-panel" aria-label="Demo neighbourhood map">
          {(desktop || mapView) && (
            <DemoMap providers={providers} selected={selection} onSelect={setSelected} />
          )}
          <div className="demo-map-footnote">
            <span className="demo-kicker">A REAL MAP. FICTIONAL NEIGHBOURS.</span>
            <p>
              Pins show invented service areas, never home addresses. Select a price pin to preview
              a provider.
            </p>
          </div>
        </aside>
      </div>
      {!savedOnly && (
        <div className="demo-closer-note">
          <Plant size={30} weight="duotone" aria-hidden="true" />
          <div>
            <h2>A neighbourhood built on the little things.</h2>
            <p>
              Explore a fuller picture in your sample workspace: repeat visits, projects in
              progress, and six months of jobs well done.
            </p>
          </div>
          <Link href="/demo/bookings">
            Open my demo bookings <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
