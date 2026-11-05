"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CategoryCard } from "@/components/category-card";
import { filterServiceCategories, serviceGroups, type ServiceGroup } from "@/lib/service-groups";

/** Source-owned, accessible pill-tab filter: adapted from EasyUI pill-navigation's
 * roving tabs and selection principles, not its original demo-specific markup.
 * https://github.com/Surajmaurya1/easyui (MIT)
 */
export function ServiceBrowse() {
  const [selected, setSelected] = useState<ServiceGroup>("all");
  const [search, setSearch] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const query = search.trim().toLocaleLowerCase("en-ZA");
  const categories = filterServiceCategories(selected).filter(
    (category) =>
      !query ||
      [category.name, category.summary, ...category.examples].some((value) =>
        value.toLocaleLowerCase("en-ZA").includes(query),
      ),
  );

  function onArrow(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = (index + offset + serviceGroups.length) % serviceGroups.length;
    setSelected(serviceGroups[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="service-browser">
      <div className="service-browser-controls">
        <label htmlFor="service-category-search">Find a service</label>
        <input
          id="service-category-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Try plumbing or garden"
          aria-describedby="service-category-count"
        />
      </div>
      <div className="service-pill-tabs" role="tablist" aria-label="Filter service categories">
        {serviceGroups.map((group, index) => (
          <button
            type="button"
            role="tab"
            key={group.id}
            id={"service-tab-" + group.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            aria-selected={selected === group.id}
            aria-controls="service-categories-panel"
            tabIndex={selected === group.id ? 0 : -1}
            className={"service-pill " + (selected === group.id ? "active" : "")}
            onClick={() => setSelected(group.id)}
            onKeyDown={(event) => onArrow(event, index)}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="service-categories-panel"
        aria-labelledby={"service-tab-" + selected}
      >
        <p className="service-result-count" id="service-category-count" role="status">
          Showing {categories.length} {categories.length === 1 ? "category" : "categories"}
        </p>
        {categories.length === 0 && (
          <div className="service-browser-empty">
            <p>No services match your search.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelected("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        <div className="category-grid page-categories">
          {categories.map((category) => (
            <CategoryCard category={category} key={category.slug} />
          ))}
        </div>
      </div>
    </div>
  );
}
