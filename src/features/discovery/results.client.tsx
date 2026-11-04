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
          onClick={(event) => {
            // A drag can synthesize a click after the release. Do not toggle twice.
            if (gesture.current.dragged) {
              gesture.current.dragged = false;
              return;
            }
            const handle = event.currentTarget;
            setExpanded((current) => !current);
            // Collapsing an absolutely positioned mobile sheet moves the handle
            // toward the map's bottom edge. Keep it on screen after layout.
            requestAnimationFrame(() => {
              handle.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
            });
          }}
          onPointerDown={(event) => {
            const initialY = event.clientY;
            const pointerId = event.pointerId;
            gesture.current = { start: initialY, dragged: false };
            listener.current?.abort();
            const controller = new AbortController();
            listener.current = controller;
            // Capture movement before the map or its overlays can stop
            // pointer events. Release can occur outside the moving sheet.
            const onMove = (move: PointerEvent) => {
              if (move.pointerId !== pointerId || gesture.current.dragged) return;
              const distance = initialY - move.clientY;
              if (Math.abs(distance) > 40) {
                gesture.current.dragged = true;
                setExpanded(distance > 0);
              }
            };
            window.addEventListener("pointermove", onMove, {
              capture: true,
              signal: controller.signal,
            });
            window.addEventListener(
              "pointerup",
              (release) => {
                if (release.pointerId !== pointerId) return;
                onMove(release);
                gesture.current.start = null;
                controller.abort();
              },
              { capture: true, signal: controller.signal },
            );
            window.addEventListener(
              "pointercancel",
              (cancel) => {
                if (cancel.pointerId !== pointerId) return;
                gesture.current.start = null;
                controller.abort();
              },
              { capture: true, signal: controller.signal },
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
