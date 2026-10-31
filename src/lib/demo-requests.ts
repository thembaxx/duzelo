/** Static editorial scenarios, never real workers, jobs, quotes, or live listings. */
export type DemoRequest = {
  id: string;
  category: 'Plumbing' | 'Home repairs' | 'Gardening' | 'Painting';
  title: string;
  brief: string;
  town: string;
  timeline: string;
  exampleBudget: string;
  categorySlug: string;
};
export const demoRequests: readonly DemoRequest[] = [
  {
    id: 'demo-101',
    category: 'Plumbing',
    categorySlug: 'plumbing',
    title: 'A kitchen tap that will not stop dripping',
    brief: 'A clear description, a convenient time window, and a private address until it is needed.',
    town: 'Mkhondo pilot example',
    timeline: 'Flexible timing',
    exampleBudget: 'Example budget: R450–R900',
  },
  {
    id: 'demo-102',
    category: 'Gardening',
    categorySlug: 'gardening',
    title: 'Get the garden ready for summer',
    brief: 'Grass cutting, edging and clearing up a small garden. One simple request.',
    town: 'Mkhondo pilot example',
    timeline: 'Weekend preference',
    exampleBudget: 'Example budget: R300–R650',
  },
  {
    id: 'demo-103',
    category: 'Painting',
    categorySlug: 'painting',
    title: 'Fresh colour for one living room',
    brief: 'Prep, patch a few small marks and give the walls a fresh coat.',
    town: 'Mkhondo pilot example',
    timeline: 'Schedule ahead',
    exampleBudget: 'Example budget: set after inspection',
  },
];
