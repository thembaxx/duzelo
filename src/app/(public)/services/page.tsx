import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/page-heading";
import { CategoryGrid } from "@/features/services/category-grid";
export const metadata: Metadata = { title: "Services" };
export default function ServicesPage() {
  return (
    <>
      <PageHeading eyebrow="The everyday. And the unexpected." title="Help for your kind of home.">
        <p>
          Explore the service categories planned for our local pilot. Worker listings and requests
          aren’t open yet.
        </p>
      </PageHeading>
      <CategoryGrid />
      <p className="language-note">
        These are service categories, not a claim of local worker availability. Regulated work will
        require category-specific credential review.
      </p>
    </>
  );
}
