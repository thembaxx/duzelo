"use client";
import { useRef } from "react";
import { DiscoveryCards } from "./cards";
import type { useDiscoverySearch } from "./use-search";
export function DiscoveryResults({
  state,
  mapView,
  expanded,
  setExpanded,
  onSelect,
}: {
  state: ReturnType<typeof useDiscoverySearch>;
  mapView: boolean;
  expanded: boolean;
  setExpanded: (value: boolean | ((current: boolean) => boolean)) => void;
  onSelect: (slug: string) => void;
}) {
  const gesture = useRef<number | null>(null);
  return (
    <section
      id="worker-results"
      tabIndex={-1}
      className={"discovery-results" + (expanded ? " expanded" : "")}
      aria-busy={state.busy}
      aria-label="Worker search results"
    >
      {mapView && (
        <button
          type="button"
          className="discovery-sheet-handle"
          aria-expanded={expanded}
          onClick={() => setExpanded((n) => !n)}
          onPointerDown={(event) => {
            gesture.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (gesture.current !== null && Math.abs(gesture.current - event.clientY) > 40)
              setExpanded(gesture.current > event.clientY);
            gesture.current = null;
          }}
        >
          {expanded ? "Collapse worker list" : "Expand worker list"}
        </button>
      )}
      <h2 aria-live="polite">
        {state.busy
          ? "Searching…"
          : state.result.workers.length + " reviewed profiles on this page"}
        {state.error ? " · previous search" : ""}
      </h2>
      <p>
        Approximate distances are to public town centres. They do not confirm service coverage or
        appointment availability.
      </p>
      {state.result.workers.length ? (
        <DiscoveryCards
          cards={state.result.workers}
          selected={state.selected}
          onSelect={onSelect}
        />
      ) : (
        <div className="empty-panel">
          <h3>No reviewed profiles match this search.</h3>
          <p>
            Try another town, a wider approximate radius or fewer filters. A submitted application
            appears only after manual review.
          </p>
        </div>
      )}
      <div className="discovery-pagination">
        <button
          type="button"
          className="button button-secondary"
          disabled={!state.previous.length || state.busy}
          onClick={() => void state.back()}
        >
          Previous page
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={!state.result.nextCursor || state.busy}
          onClick={() => void state.next()}
        >
          Next page
        </button>
      </div>
    </section>
  );
}
