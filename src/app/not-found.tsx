import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
export default function NotFound() {
  return (
    <section className="shell inner-page narrow-page">
      <p className="eyebrow">404 / PAGE NOT FOUND</p>
      <h1 className="inner-heading">
        Lost your <em>way?</em>
      </h1>
      <p className="inner-lede">That page doesn't exist or isn't available right now.</p>
      <Link href="/" className="button button-primary">
        <ArrowLeft size={18} aria-hidden="true" /> Back to Duzelo
      </Link>
    </section>
  );
}
