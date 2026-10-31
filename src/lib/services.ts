export type ServiceCategory = {
  slug: string;
  name: string;
  summary: string;
  examples: string[];
  number: string;
};

export const serviceCategories: readonly ServiceCategory[] = [
  {
    slug: 'home-repairs',
    name: 'Home repairs',
    summary: 'Keep your space safe, functional and comfortable.',
    examples: ['Minor repairs', 'Furniture assembly', 'General maintenance'],
    number: '01',
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    summary: 'Get help understanding and resolving plumbing issues.',
    examples: ['Leaking taps', 'Blocked drains', 'Pipe inspections'],
    number: '02',
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    summary: 'Find qualified help for electrical work when available.',
    examples: ['Fault finding', 'Light fittings', 'Electrical inspections'],
    number: '03',
  },
  {
    slug: 'cleaning',
    name: 'Cleaning',
    summary: 'Support with everyday cleaning and one-off jobs.',
    examples: ['Home cleaning', 'Deep cleaning', 'Move-in cleaning'],
    number: '04',
  },
  {
    slug: 'gardening',
    name: 'Gardening',
    summary: 'Take care of outdoor spaces and seasonal upkeep.',
    examples: ['Garden maintenance', 'Grass cutting', 'Yard cleanup'],
    number: '05',
  },
  {
    slug: 'painting',
    name: 'Painting',
    summary: 'Refresh your walls and surfaces with the right help.',
    examples: ['Interior painting', 'Exterior painting', 'Surface prep'],
    number: '06',
  },
] as const;

export function findServiceCategory(slug: string): ServiceCategory | undefined {
  return serviceCategories.find((category) => category.slug === slug);
}

export function searchServiceCategories(term: string): ServiceCategory[] {
  const query = term.trim().toLocaleLowerCase('en-ZA');
  if (!query) return [...serviceCategories];
  return serviceCategories.filter((category) =>
    [category.name, category.summary, ...category.examples]
      .some((text) => text.toLocaleLowerCase('en-ZA').includes(query)),
  );
}
