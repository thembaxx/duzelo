"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, MapPin, Star } from "@phosphor-icons/react";
import { categoryName, demoMoney, type DemoProvider } from "./catalogue";
import { useDemo } from "./store.client";
import { playDemoHaptic } from "./haptics";

export function ProviderCard({
  provider: p,
  selected,
  onMap,
}: {
  provider: DemoProvider;
  selected?: boolean;
  onMap?: () => void;
}) {
  const { state, dispatch } = useDemo();
  const saved = !!state?.saved.includes(p.slug);
  return (
    <article
      className={"demo-provider-card demo-enter" + (selected ? " is-selected" : "")}
      data-provider={p.slug}
    >
      <div className="demo-provider-photo">
        <Link href={`/demo/providers/${p.slug}`} tabIndex={-1} aria-hidden="true">
          <Image
            src={`/demo/${p.photo}.webp`}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 27vw"
          />
        </Link>
        <span className="demo-photo-tag">{categoryName(p.category)}</span>
        <button
          className="demo-save"
          type="button"
          aria-label={`${saved ? "Unsave" : "Save"} ${p.name}`}
          aria-pressed={saved}
          disabled={!state}
          onClick={() => {
            dispatch({ type: "save", slug: p.slug });
            playDemoHaptic("save");
          }}
        >
          <Heart size={20} weight={saved ? "fill" : "regular"} aria-hidden="true" />
        </button>
        <span className="demo-stock-label">Illustrative photo</span>
      </div>
      <div className="demo-provider-body">
        <div className="demo-provider-title">
          <span className={`demo-avatar demo-avatar-${p.accent}`} aria-hidden="true">
            {p.initials}
          </span>
          <div>
            <h3>
              <Link href={`/demo/providers/${p.slug}`}>{p.name}</Link>
            </h3>
            <p>{p.person}</p>
          </div>
          <ArrowUpRight size={19} aria-hidden="true" />
        </div>
        <p className="demo-provider-pitch">{p.headline}</p>
        <div className="demo-provider-meta">
          <span>
            <Star size={14} weight="fill" aria-hidden="true" />{" "}
            <strong>{p.rating.toFixed(1)}</strong> ({p.reviews} sample reviews)
          </span>
          <span>{p.area}</span>
        </div>
        <div className="demo-provider-bottom">
          <span>
            From <strong>{demoMoney(Math.min(...p.services.map((s) => s.price)))}</strong>
            <small> / sample visit</small>
          </span>
          {onMap ? (
            <button
              type="button"
              onClick={onMap}
              aria-label={`Show ${p.name} on map`}
              aria-pressed={selected}
            >
              <MapPin size={17} aria-hidden="true" />
              <span>On map</span>
            </button>
          ) : (
            <Link href={`/demo/providers/${p.slug}`}>
              View services <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
