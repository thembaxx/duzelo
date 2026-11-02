/** Entirely fictional catalogue. Never used by discovery, auth or booking APIs. */
export const demoCategories = [
  { id: "all", name: "All services", symbol: "SquaresFour" },
  { id: "cleaning", name: "Cleaning", symbol: "Sparkle" },
  { id: "gardening", name: "Gardening", symbol: "Plant" },
  { id: "plumbing", name: "Plumbing", symbol: "Drop" },
  { id: "electrical", name: "Electrical", symbol: "Lightning" },
  { id: "painting", name: "Painting", symbol: "PaintRoller" },
  { id: "home-repairs", name: "Home repairs", symbol: "Hammer" },
] as const;
export type DemoCategory = (typeof demoCategories)[number]["id"];
export type DemoService = {
  id: string;
  name: string;
  price: number;
  duration: string;
  includes: string[];
};
export type DemoProvider = {
  slug: string;
  name: string;
  person: string;
  initials: string;
  category: Exclude<DemoCategory, "all">;
  area: string;
  point: [number, number];
  photo: string;
  photoAlt: string;
  accent: "sage" | "sand" | "rose";
  rating: number;
  reviews: number;
  jobs: number;
  experience: string;
  headline: string;
  bio: string;
  languages: string[];
  services: DemoService[];
};

export const demoProviders: readonly DemoProvider[] = [
  {
    slug: "demo-lindi-home-care",
    name: "Lindi’s Home Care",
    person: "Lindiwe Mokoena",
    initials: "LM",
    category: "cleaning",
    area: "Central Mkhondo",
    point: [30.81, -27.0],
    photo: "cleaning",
    photoAlt: "Illustrative stock photo of a cleaner wiping window shutters",
    accent: "sage",
    rating: 4.9,
    reviews: 38,
    jobs: 64,
    experience: "6 years",
    headline: "A fresh home. A lighter week.",
    bio: "Meet Lindi, a fictional home-care specialist who takes the little details seriously. This sample profile is built around thoughtful weekly cleans, a clear checklist and time back in your day.",
    languages: ["English", "isiZulu", "siSwati"],
    services: [
      {
        id: "regular-clean",
        name: "Everyday home clean",
        price: 380,
        duration: "3 hours",
        includes: [
          "Kitchen and bathroom surfaces",
          "Floors, dusting and a final tidy",
          "Cleaning supplies included in this demo",
        ],
      },
      {
        id: "deep-clean",
        name: "A proper deep clean",
        price: 780,
        duration: "5 hours",
        includes: [
          "Everyday clean plus detailed edges",
          "Cupboard fronts and interior windows",
          "One sample two-bedroom home",
        ],
      },
    ],
  },
  {
    slug: "demo-green-corner",
    name: "Green Corner Gardens",
    person: "Thabo Dlamini",
    initials: "TD",
    category: "gardening",
    area: "West Mkhondo",
    point: [30.79, -27.01],
    photo: "garden",
    photoAlt: "Illustrative stock photo of a garden trowel, soil and seedlings",
    accent: "sand",
    rating: 4.8,
    reviews: 27,
    jobs: 51,
    experience: "8 years",
    headline: "A little care goes a long way.",
    bio: "Thabo’s fictional garden team brings unruly corners back to life. Explore a sample lawn-care visit or a seasonal refresh, with the work and cleanup agreed up front.",
    languages: ["English", "isiZulu"],
    services: [
      {
        id: "garden-tidy",
        name: "Garden tidy & lawn care",
        price: 450,
        duration: "3 hours",
        includes: [
          "Mow and edge a small lawn",
          "Weed visible beds",
          "Bag clippings for collection",
        ],
      },
      {
        id: "seasonal-garden",
        name: "Seasonal garden refresh",
        price: 850,
        duration: "5 hours",
        includes: [
          "Lawn care and bed preparation",
          "Light pruning below shoulder height",
          "Planting labour; plants excluded",
        ],
      },
    ],
  },
  {
    slug: "demo-steady-flow",
    name: "Steady Flow Plumbing",
    person: "Sipho Nkosi",
    initials: "SN",
    category: "plumbing",
    area: "East Mkhondo",
    point: [30.83, -27.0],
    photo: "plumbing",
    photoAlt: "Illustrative stock photo of chrome taps and a bathroom basin",
    accent: "rose",
    rating: 4.9,
    reviews: 46,
    jobs: 83,
    experience: "11 years",
    headline: "Small leaks deserve proper attention.",
    bio: "This fictional profile shows how an experienced plumber might explain a straightforward repair. Clear scope, a tidy workspace and no surprise extras are the idea behind this demo.",
    languages: ["English", "isiZulu", "Afrikaans"],
    services: [
      {
        id: "tap-repair",
        name: "Leaking tap repair",
        price: 550,
        duration: "1–2 hours",
        includes: [
          "Inspect one accessible tap",
          "Replace a standard washer",
          "Test the repair and tidy up",
        ],
      },
      {
        id: "plumbing-check",
        name: "Home plumbing check",
        price: 700,
        duration: "2 hours",
        includes: [
          "Visual checks of accessible fittings",
          "Check visible leaks and water pressure",
          "Written sample maintenance checklist",
        ],
      },
    ],
  },
  {
    slug: "demo-brightside",
    name: "Brightside Electrical",
    person: "Ayanda Khumalo",
    initials: "AK",
    category: "electrical",
    area: "North Mkhondo",
    point: [30.81, -26.98],
    photo: "electrical",
    photoAlt: "Illustrative stock photo of an electrician working on a wall fitting",
    accent: "sand",
    rating: 4.8,
    reviews: 31,
    jobs: 57,
    experience: "9 years",
    headline: "Make the everyday work beautifully.",
    bio: "Ayanda is a fictional electrical specialist. This sample is a way to explore a service profile; no qualifications, registration or electrical safety certification have been verified.",
    languages: ["English", "isiZulu"],
    services: [
      {
        id: "light-fitting",
        name: "Light fitting replacement",
        price: 650,
        duration: "1–2 hours",
        includes: [
          "One accessible existing light point",
          "Labour and basic fitting checks",
          "Customer-supplied fitting in this demo",
        ],
      },
      {
        id: "fault-inspection",
        name: "Electrical fault inspection",
        price: 800,
        duration: "2 hours",
        includes: [
          "Sample fault-finding visit",
          "Scope explained before any repair",
          "No certificate issued by this demo",
        ],
      },
    ],
  },
  {
    slug: "demo-fresh-coat",
    name: "Fresh Coat Studio",
    person: "Lerato Maseko",
    initials: "LM",
    category: "painting",
    area: "South Mkhondo",
    point: [30.82, -27.03],
    photo: "painting",
    photoAlt: "Illustrative stock photo of blue paint being rolled onto a wall",
    accent: "sage",
    rating: 4.9,
    reviews: 22,
    jobs: 35,
    experience: "7 years",
    headline: "A new chapter for your favourite room.",
    bio: "Lerato’s fictional painting studio loves a careful edge and a fresh start. Compare example room-painting scopes, including preparation, protection and cleanup.",
    languages: ["English", "Sesotho", "isiZulu"],
    services: [
      {
        id: "room-paint",
        name: "One-room paint refresh",
        price: 1800,
        duration: "1 day",
        includes: [
          "Protect furniture and floors",
          "Minor preparation and two coats",
          "Labour for one 12m² room; paint excluded",
        ],
      },
      {
        id: "wall-touchup",
        name: "Wall touch-ups",
        price: 650,
        duration: "3 hours",
        includes: [
          "Up to five small scuffs or patches",
          "Light surface preparation",
          "Customer-supplied matching paint",
        ],
      },
    ],
  },
  {
    slug: "demo-made-right",
    name: "Made Right Repairs",
    person: "Pieter Joubert",
    initials: "PJ",
    category: "home-repairs",
    area: "Central Mkhondo",
    point: [30.8, -27.02],
    photo: "repairs",
    photoAlt: "Illustrative stock photo of tradespeople preparing timber indoors",
    accent: "rose",
    rating: 4.7,
    reviews: 34,
    jobs: 72,
    experience: "14 years",
    headline: "For the jobs on your someday list.",
    bio: "A fictional handy-person service for shelves, flat packs and the everyday things that never quite get done. Pick a clear example task and see how a booking comes together.",
    languages: ["English", "Afrikaans"],
    services: [
      {
        id: "small-repairs",
        name: "Small home repairs",
        price: 480,
        duration: "2 hours",
        includes: [
          "Adjust hinges or fit simple handles",
          "A sample list of up to three tasks",
          "Labour only; hardware excluded",
        ],
      },
      {
        id: "furniture-assembly",
        name: "Flat-pack furniture assembly",
        price: 620,
        duration: "3 hours",
        includes: [
          "One small flat-pack item",
          "Assembly to supplied instructions",
          "Packaging neatly gathered",
        ],
      },
    ],
  },
  {
    slug: "demo-sunday-reset",
    name: "Sunday Reset",
    person: "Zanele Dube",
    initials: "ZD",
    category: "cleaning",
    area: "eThandukukhanya area",
    point: [30.78, -27.02],
    photo: "home",
    photoAlt: "Illustrative stock photo of a tidy sunlit living room",
    accent: "rose",
    rating: 4.8,
    reviews: 19,
    jobs: 29,
    experience: "5 years",
    headline: "Walk back into a calmer home.",
    bio: "This fictional small cleaning team is all about a considered reset. The example profile focuses on move-in cleans and living spaces that feel ready for the week ahead.",
    languages: ["English", "isiZulu", "siSwati"],
    services: [
      {
        id: "living-reset",
        name: "Living-space reset",
        price: 420,
        duration: "3 hours",
        includes: [
          "Dust, vacuum and mop living areas",
          "Kitchen surfaces and bathroom tidy",
          "One sample two-bedroom home",
        ],
      },
      {
        id: "move-in-clean",
        name: "Move-in clean",
        price: 950,
        duration: "6 hours",
        includes: [
          "Empty two-bedroom home",
          "Accessible cupboards and windows",
          "Kitchen, bathrooms and floors",
        ],
      },
    ],
  },
  {
    slug: "demo-root-grow",
    name: "Root & Grow",
    person: "Themba Zulu",
    initials: "TZ",
    category: "gardening",
    area: "East Mkhondo",
    point: [30.84, -27.02],
    photo: "garden",
    photoAlt: "Illustrative stock photo of potting soil and garden tools",
    accent: "sage",
    rating: 4.9,
    reviews: 24,
    jobs: 43,
    experience: "10 years",
    headline: "An outdoor space worth slowing down for.",
    bio: "A fictional garden-care service with an eye for small outdoor spaces. Try a sample visit for beds, pots and the corners that need a little love.",
    languages: ["English", "isiZulu"],
    services: [
      {
        id: "bed-care",
        name: "Garden-bed care",
        price: 350,
        duration: "2 hours",
        includes: [
          "Weed and loosen two small beds",
          "Light hand pruning",
          "Mulch labour; materials excluded",
        ],
      },
      {
        id: "outdoor-reset",
        name: "Weekend outdoor reset",
        price: 600,
        duration: "4 hours",
        includes: [
          "Garden-bed care and a small lawn",
          "Sweep paths and gather green waste",
          "Tools included in this sample",
        ],
      },
    ],
  },
];

export function findDemoProvider(slug: string) {
  return demoProviders.find((p) => p.slug === slug);
}
export function demoMoney(amount: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}
export function categoryName(id: DemoCategory) {
  return demoCategories.find((c) => c.id === id)?.name ?? "All services";
}
export function filterDemoProviders(
  query: string,
  category: string,
  sort: string,
  saved?: readonly string[],
) {
  const words = query.trim().toLocaleLowerCase("en-ZA").split(/\s+/).filter(Boolean);
  const result = demoProviders.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (!saved || saved.includes(p.slug)) &&
      words.every((word) =>
        [
          p.name,
          p.person,
          p.headline,
          p.area,
          categoryName(p.category),
          ...p.services.map((s) => s.name),
        ]
          .join(" ")
          .toLocaleLowerCase("en-ZA")
          .includes(word),
      ),
  );
  if (sort === "price")
    result.sort(
      (a, b) =>
        Math.min(...a.services.map((s) => s.price)) - Math.min(...b.services.map((s) => s.price)),
    );
  if (sort === "rating") result.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  return result;
}
