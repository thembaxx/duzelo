import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarBlank, Plant } from "@phosphor-icons/react/dist/ssr";

export function HomeDemoPreview() {
  return (
    <div className="home-photo-preview" aria-label="Interactive marketplace demo preview">
      <Image
        src="/demo/home.webp"
        alt="Illustrative sunlit home with plants and a comfortable living room"
        fill
        priority
        sizes="(max-width:860px) 100vw, 45vw"
      />
      <span className="home-preview-caption">
        A little room for the good things.<small>Illustrative stock photography</small>
      </span>
      <div className="home-preview-card">
        <div className="home-preview-card-top">
          <Plant size={23} weight="duotone" aria-hidden="true" />
          <span>
            YOUR NEXT LITTLE WIN<small>Fictional booking preview</small>
          </span>
          <span className="home-preview-date">DEMO</span>
        </div>
        <h2>
          A garden ready
          <br />
          for slow Sundays.
        </h2>
        <p>
          <CalendarBlank size={15} aria-hidden="true" /> Seasonal garden refresh · sample visit
        </p>
        <Link href="/demo/bookings/demo-booking-1002">
          Step inside the demo <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
      </div>
      <Link href="/demo" className="home-preview-pill">
        Explore your sample neighbourhood <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
