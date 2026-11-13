export const site = {
  name: 'Kanishq Surendran',
  first: 'Kanishq',
  last: 'Surendran',
  role: 'Developer & designer of considered digital products',
  location: 'India — IST',
  timezone: 'Asia/Kolkata',
  links: {
    github: 'https://github.com/FLASH860',
    // TODO(Kanishq): confirm these two — see NOTES.md
    linkedin: 'https://www.linkedin.com/',
    email: 'hello@example.com',
  },
}

export type Project = {
  slug: string
  index: string
  title: string
  kind: string
  year: string
  summary: string
  role: string
  stack: string[]
  palette: [string, string, string] // deep, mid, highlight
  body: { heading: string; text: string }[]
}

// Copy for Property Wallet and CRM Cockpit is placeholder written from the project names —
// replace with the real story (see NOTES.md).
export const projects: Project[] = [
  {
    slug: 'property-wallet',
    index: '01',
    title: 'Property Wallet',
    kind: 'Real-estate finance',
    year: '2026',
    summary: 'Every property you own, owe on, or are watching — held in one calm ledger.',
    role: 'Product design, full-stack build',
    stack: ['React', 'TypeScript', 'Node', 'PostgreSQL'],
    palette: ['#10231c', '#1f5a45', '#d9c08a'],
    body: [
      { heading: 'The brief', text: 'Property paperwork lives in inboxes, drawers and spreadsheets. Property Wallet gathers deeds, payments, valuations and reminders into a single place that reads like a private bank statement rather than a dashboard.' },
      { heading: 'The approach', text: 'One ledger, three depths: portfolio, property, document. Each level keeps the same quiet layout so moving deeper never feels like arriving somewhere new. Numbers are typeset first; charts are earned.' },
      { heading: 'The result', text: 'A product that answers “where do I stand?” in a glance, and the follow-up question in one tap.' },
    ],
  },
  {
    slug: 'crm-cockpit',
    index: '02',
    title: 'CRM Cockpit',
    kind: 'Sales operations',
    year: '2026',
    summary: 'A single pane for the pipeline: what moved, what stalled, what needs a call today.',
    role: 'Interface design, front-end architecture',
    stack: ['React', 'TypeScript', 'REST', 'Charts'],
    palette: ['#141a2c', '#2c4a8a', '#e6d3b0'],
    body: [
      { heading: 'The brief', text: 'Sales teams were flying on five instruments at once. CRM Cockpit collapses them into one view built around the only question that matters each morning: who do I talk to first?' },
      { heading: 'The approach', text: 'Dense where it helps, silent where it does not. Deals are ranked by momentum rather than size, and every panel can be driven from the keyboard.' },
      { heading: 'The result', text: 'Fewer tabs, shorter stand-ups, and a pipeline that explains itself.' },
    ],
  },
  {
    slug: 'holy-grail',
    index: '03',
    title: 'Holy Grail',
    kind: 'This portfolio',
    year: '2026',
    summary: 'A portfolio built like a product launch: real materials, studio light, weighted motion.',
    role: 'Direction, design, WebGL build',
    stack: ['React Three Fiber', 'GSAP', 'Lenis', 'GLSL'],
    palette: ['#1c1510', '#6b4a24', '#e9d2a2'],
    body: [
      { heading: 'The brief', text: 'No flat screens. Every section had to carry depth and reward a second look, without a single particle, glitch or gimmick.' },
      { heading: 'The approach', text: 'Objects are modelled procedurally and lit like a product shoot. Scroll drives the choreography; easing is slow and heavy; each screen holds exactly one idea.' },
      { heading: 'The result', text: 'You are looking at it.' },
    ],
  },
  {
    slug: 'field-studies',
    index: '04',
    title: 'Field Studies',
    kind: 'Experiments',
    year: 'Ongoing',
    summary: 'Small builds made to learn one thing properly: a shader, a transition, a layout.',
    role: 'Everything',
    stack: ['GLSL', 'Three.js', 'CSS', 'Canvas'],
    palette: ['#221419', '#7a2f3f', '#efd6c4'],
    body: [
      { heading: 'The brief', text: 'A standing appointment with curiosity. Each study isolates one technique and pushes it until it either becomes useful or becomes a lesson.' },
      { heading: 'The approach', text: 'Short cycles, strict scope, everything shipped in the browser. The ink-bleed theme switch and the exploded watch on this site both started here.' },
      { heading: 'The result', text: 'A drawer full of parts that keep finding their way into client work.' },
    ],
  },
]

export const brand = {
  name: 'VEYRA',
  tagline: 'Still energy',
  blurb: 'A made-up drink for a made-up shelf. Cold-brewed botanicals, natural caffeine, nothing loud.',
}

export type Flavour = { id: string; name: string; notes: string; deep: string; mid: string; glow: string; caffeine: string; text: string }

export const flavours: Flavour[] = [
  { id: 'yuzu', name: 'Yuzu Citrine', notes: 'Yuzu peel · white tea · sea salt', deep: '#3a2f08', mid: '#b8962a', glow: '#f1d877', caffeine: '80 mg', text: 'Bright at the front, dry at the finish. The one to open before noon.' },
  { id: 'cherry', name: 'Black Cherry', notes: 'Morello · cacao husk · oak', deep: '#2a070d', mid: '#7d1626', glow: '#e0586a', caffeine: '95 mg', text: 'Dark fruit with a bitter-chocolate spine. Built for late edits.' },
  { id: 'mint', name: 'Glacier Mint', notes: 'Spearmint · cucumber · lime leaf', deep: '#06261f', mid: '#17705c', glow: '#7fe0c2', caffeine: '70 mg', text: 'Cold, clean and nearly weightless. A reset in a can.' },
  { id: 'orange', name: 'Blood Orange', notes: 'Tarocco · rooibos · pink pepper', deep: '#2e1004', mid: '#b8481a', glow: '#ff9a5c', caffeine: '85 mg', text: 'Sun-warm citrus with a peppered edge. Loud flavour, quiet lift.' },
  { id: 'plum', name: 'Midnight Plum', notes: 'Damson · black tea · vanilla', deep: '#150c2a', mid: '#44307e', glow: '#a996f0', caffeine: '60 mg', text: 'Soft, round and slow. For the last hour of the day.' },
]
