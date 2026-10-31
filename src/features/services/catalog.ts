import {
  Droplets,
  KeyRound,
  PanelsTopLeft,
  PaintRoller,
  Hammer,
  Sparkles,
  Sprout,
  Plug,
  Wrench,
} from "lucide-react";

// Confirmed service taxonomy, not live inventory or a claim of availability.
export const services = [
  {
    slug: "plumbing",
    name: "Plumbing",
    description: "Taps, pipes & water systems",
    icon: Droplets,
    tone: "lime",
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    description: "A fresh start for your space",
    icon: Sparkles,
    tone: "peach",
  },
  {
    slug: "gardening",
    name: "Gardening",
    description: "A little care for the outdoors",
    icon: Sprout,
    tone: "sage",
  },
  {
    slug: "home-repairs",
    name: "Home repairs",
    description: "The fixes that make a home",
    icon: Hammer,
    tone: "lilac",
  },
  {
    slug: "painting",
    name: "Painting",
    description: "Walls, finishes & fresh colour",
    icon: PaintRoller,
    tone: "peach",
  },
  {
    slug: "locksmithing",
    name: "Locksmithing",
    description: "Locks, keys & access",
    icon: KeyRound,
    tone: "sage",
  },
  {
    slug: "window-installation",
    name: "Window installation",
    description: "Windows, frames & fitting",
    icon: PanelsTopLeft,
    tone: "lilac",
  },
  {
    slug: "installations",
    name: "Installations",
    description: "Help getting things in place",
    icon: Plug,
    tone: "lime",
  },
  {
    slug: "maintenance",
    name: "Maintenance",
    description: "Keeping everyday things going",
    icon: Wrench,
    tone: "sage",
  },
] as const;
export function findService(slug: string) {
  return services.find((service) => service.slug === slug);
}
