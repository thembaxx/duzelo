import Link from "next/link";
import { services } from "./catalog";

export function CategoryGrid({ preview = false }: { preview?: boolean }) {
  return (
    <div className="category-grid">
      {(preview ? services.slice(0, 4) : services).map(
        ({ slug, name, description, icon: Icon, tone }) => (
          <Link className="category-tile" href={`/services/${slug}`} key={slug}>
            <span className="category-icon" data-tone={tone}>
              <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h3>{name}</h3>
            <p>{description}</p>
          </Link>
        ),
      )}
    </div>
  );
}
