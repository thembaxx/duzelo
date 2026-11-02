import Link from "next/link";
export default function DemoAboutPage() {
  return (
    <article className="demo-shell demo-about">
      <p className="demo-kicker">A CLEARER LOOK AT THE EXPERIENCE</p>
      <h1>
        A real product demo.
        <br />
        <em>An imagined neighbourhood.</em>
      </h1>
      <p>
        This interactive workspace uses fictional providers, people, prices, reviews and six months
        of sample booking activity. It is available on the production website so you can try the
        experience without signing in.
      </p>
      <h2>What you can try</h2>
      <p>
        Search and filter services, explore a real basemap, save providers, create a sample booking,
        change its date, simulate progress, cancel a visit and leave a sample rating. Demo changes
        stay in this browser. Use Reset demo to restore the original workspace.
      </p>
      <h2>What the map shows</h2>
      <p>
        The map uses{" "}
        <a href="https://openfreemap.org/quick_start/" target="_blank" rel="noreferrer">
          OpenFreeMap
        </a>
        , © OpenMapTiles, with data from{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
        . Pins are invented, approximate service areas around Mkhondo. They do not identify homes,
        worker bases or a live worker’s position. Opening the map requests tiles from OpenFreeMap.
        The provider list remains available when maps cannot load.
      </p>
      <h2>Photography</h2>
      <p>
        Service and home photographs are used under the{" "}
        <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">
          Unsplash licence
        </a>
        . They are illustrative stock images, not photographs of the named sample providers or their
        work. No endorsement is implied. Final brand photography is still provisional.
      </p>
      <ul>
        {[
          ["Sunlit living room", "photo-1600210492486-724fe5c67fb0"],
          ["Window cleaning", "photo-1581578731548-c64695cc6952"],
          ["Garden tools", "photo-1416879595882-3373a0480b5b"],
          ["Electrical work", "photo-1621905251189-08b45d6a269e"],
          ["Bathroom taps", "photo-1585704032915-c3400ca199e7"],
          ["Painting", "photo-1562259949-e8e7689d7828"],
          ["Home repairs", "photo-1505798577917-a65157d3320a"],
        ].map(([label, id]) => (
          <li key={id}>
            <a href={`https://images.unsplash.com/${id}`} target="_blank" rel="noreferrer">
              {label} · original source
            </a>
          </li>
        ))}
      </ul>
      <h2>No real-world commitments</h2>
      <p>
        Demo actions do not create real bookings, send messages, verify workers, charge money or
        change production marketplace data. Real services remain subject to the application’s
        server-side authorization and launch gates.
      </p>
      <Link href="/demo" className="button button-primary">
        Back to your sample neighbourhood
      </Link>
    </article>
  );
}
