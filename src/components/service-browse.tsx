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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const categories = filterServiceCategories(selected);

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
        <p className="service-result-count" role="status">
          Showing {categories.length} {categories.length === 1 ? "category" : "categories"}
        </p>
        <div className="category-grid page-categories">
          {categories.map((category) => (
            <CategoryCard category={category} key={category.slug} />
          ))}
        </div>
      </div>
    </div>
  );
}
