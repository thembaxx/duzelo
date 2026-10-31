export const supportedLocales = ['en', 'zu', 'ss'] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = 'en';

// English-only copy for Milestone 00. Other locales are intentionally not
// advertised as translated until reviewed translations are available.
export const englishCopy = {
  brand: 'Duzelo',
  tagline: 'Good help, close to home.',
  explore: 'Explore services',
  howItWorks: 'How it works',
  trust: 'Trust & safety',
  settings: 'Appearance',
} as const;
