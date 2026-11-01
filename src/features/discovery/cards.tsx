import Link from "next/link";
import type { DiscoveryCard } from "./types";
export function DiscoveryCards({
  cards,
  selected,
  onSelect,
}: {
  cards: DiscoveryCard[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <ul className="discovery-card-list">
      {cards.map((card) => (
        <li
          key={card.slug}
          id={"worker-" + card.slug}
          className={"discovery-card" + (selected === card.slug ? " selected" : "")}
        >
          <p className="eyebrow">{card.town} · approximate area</p>
          <h3>
            <Link href={"/workers/" + card.slug}>{card.name}</Link>
          </h3>
          <p>{card.bio}</p>
          <p>
            {card.identityReviewed ? "Identity reviewed" : ""}
            {card.businessReviewed ? " · Business reviewed" : ""}
          </p>
          <ul className="discovery-categories">
            {card.categories.map((c) => (
              <li key={c.id}>
                {c.label}
                {c.tradeReviewed ? " · Trade credential reviewed" : ""}
              </li>
            ))}
          </ul>
          <p>
            {card.distanceBand ?? "Choose a search area for approximate distances"} ·{" "}
            {card.available ? "Open to enquiries" : "Not accepting enquiries"}
          </p>
          <button
            type="button"
            aria-pressed={selected === card.slug}
            className="button button-secondary"
            onClick={() => onSelect(card.slug)}
          >
            Select {card.name}
          </button>
          <Link className="text-link" href={"/workers/" + card.slug}>
            View profile
          </Link>
        </li>
      ))}
    </ul>
  );
}
