"use client";
import { useEffect, useRef } from "react";
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
  const listener = useRef<AbortController | null>(null);
  useEffect(() => () => listener.current?.abort(), []);
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
          onClick={() => {
            // A drag can emit a synthetic click with detail=0 after pointer capture.
            // Swallow that click so it cannot undo the completed swipe.
            if (gesture.current.dragged) {
              gesture.current.dragged = false;
              return;
            }
            setExpanded((current) => !current);
          }}
          onPointerDown={(event) => {
            const initialY = event.clientY;
            const pointerId = event.pointerId;
            gesture.current = { start: initialY, dragged: false };
            listener.current?.abort();
            const controller = new AbortController();
            listener.current = controller;
            // A pointer released above the sheet may not fire onPointerUp on
            // the button. Observe the release at window scope instead.
            window.addEventListener(
              "pointerup",
              (release) => {
                if (release.pointerId !== pointerId) return;
                const distance = initialY - release.clientY;
                if (Math.abs(distance) > 40) {
                  gesture.current.dragged = true;
                  setExpanded(distance > 0);
                }
                gesture.current.start = null;
                controller.abort();
              },
              { signal: controller.signal },
            );
            window.addEventListener(
              "pointercancel",
              (cancel) => {
                if (cancel.pointerId === pointerId) controller.abort();
              },
              { signal: controller.signal },
            );
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
