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
  const gesture = useRef({ start: null as number | null, dragged: false });
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
          onClick={(event) => {
            if (!gesture.current.dragged || event.detail === 0) setExpanded((n) => !n);
            gesture.current.dragged = false;
          }}
          onPointerDown={(event) => {
            gesture.current = { start: event.clientY, dragged: false };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = gesture.current.start;
            if (start !== null && Math.abs(start - event.clientY) > 40) {
              gesture.current.dragged = true;
              setExpanded(start > event.clientY);
            }
            gesture.current.start = null;
          }}
          onPointerCancel={() => {
            gesture.current = { start: null, dragged: false };
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
