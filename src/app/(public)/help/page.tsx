import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/layout/page-heading";
export const metadata: Metadata = { title: "Help & install" };
export default function HelpPage() {
  return (
    <div className="reading-layout">
      <PageHeading eyebrow="Keep it close" title="A little help with the app.">
        <p>
          This is a foundation preview. Accounts, job requests and worker listings are not open.
          There is no staffed support channel configured yet.
        </p>
      </PageHeading>
      <section className="prose-block" id="install">
        <h2>Add to your home screen.</h2>
        <p>
          On a supported browser, open the browser menu and choose “Install app” or “Add to Home
          Screen”. On iPhone or iPad, use Safari’s Share menu, then “Add to Home Screen”.
          Installation requires HTTPS outside localhost and browser support.
        </p>
        <p>
          The installed app opens the same preview. Only a generic offline page is saved; private
          pages, sessions and documents are never stored by the service worker.
        </p>
      </section>
      <section className="prose-block" id="languages">
        <h2>English first. More languages to follow.</h2>
        <p>
          English is available now. isiZulu and siSwati have language scaffolding and fall back to
          English until translations are reviewed. There is no language switch that pretends the
          translations are complete.
        </p>
      </section>
      <section className="prose-block">
        <h2>What can I do now?</h2>
        <p>
          Explore the planned service categories, read about the intended marketplace journey and
          review the privacy approach. No account or location permission is needed.
        </p>
        <Link href="/services" className="text-link">
          Explore services ↗
        </Link>
      </section>
    </div>
  );
}
