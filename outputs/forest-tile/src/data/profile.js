// Armin's profile, from his CVs (the same facts his Keel config holds). Nothing
// here is invented: change it here and every place in the city follows.
export const PROFILE = {
  name: 'Armin Parvardegary',
  role: 'Design engineer',
  location: 'Istanbul, Turkey',
  study: 'Computer Programming at Kent University Istanbul',
  services: [
    'UI/UX design',
    'Visual design',
    'Frontend development',
    '3D design',
    '3D web experiences',
    'AI-assisted design',
    'Motion design and video editing',
  ],
};

// Jobs, newest first. Months are 1 to 12.
export const JOBS = [
  {
    id: 'rush',
    name: 'Rush Graphics',
    role: 'Senior Design Engineer · Senior Frontend Developer',
    start: [2024, 7],
    end: [2026, 9],
    place: 'USA · remote',
    accent: '#ff6b5e',
    note: '',
  },
  {
    id: 'hindra',
    name: 'Hindra Studio',
    role: 'Lead Designer · Frontend Developer',
    start: [2023, 1],
    end: [2024, 6],
    place: 'Turkey',
    accent: '#5ab4f0',
    note: '',
  },
  {
    id: 'aaq',
    name: 'AAQ Real Estate',
    role: 'Design Engineer · Frontend Developer',
    start: [2021, 1],
    end: [2022, 12],
    place: 'United Kingdom',
    accent: '#3fb8a8',
    note: 'CRM workflows, internal tools and campaign systems with Sales and Marketing',
  },
  {
    id: 'bigup',
    name: 'Big Uppetite',
    role: 'Design Engineer · Junior Frontend Developer',
    start: [2019, 1],
    end: [2020, 12],
    place: 'Australia',
    accent: '#ffc93a',
    note: '15+ digital products',
  },
];
export const months = j => (j.end[0] - j.start[0]) * 12 + (j.end[1] - j.start[1]) + 1;
export const duration = j => {
  const m = months(j),
    y = Math.floor(m / 12),
    r = m % 12;
  return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', r ? `${r} mo${r > 1 ? 's' : ''}` : '']
    .filter(Boolean)
    .join(' ');
};
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const span = j => `${MONTH[j.start[1] - 1]} ${j.start[0]} – ${MONTH[j.end[1] - 1]} ${j.end[0]}`;
// Total time across all jobs, in whole years.
export const totalYears = () => Math.floor(JOBS.reduce((a, j) => a + months(j), 0) / 12);
// The shape the Experience list and card use.
export const STUDIOS = JOBS.map(j => ({ ...j, years: `${j.start[0]} – ${j.end[0]}` }));

// Skills as small places on Skills Street: [name, kind of place].
export const SHOPS = [
  ['Figma', 'Café'],
  ['Behance', 'Restaurant'],
  ['Photoshop', 'Bakery'],
  ['InDesign', 'Bookshop'],
  ['React', 'Pizza'],
  ['Next.js', 'Diner'],
  ['Three.js', 'Arcade'],
  ['GSAP', 'Juice Bar'],
  ['Tailwind', 'Ice Cream'],
  ['TypeScript', 'Tea House'],
  ['VS Code', 'Coffee Bar'],
  ['GitHub', 'Garage'],
];
