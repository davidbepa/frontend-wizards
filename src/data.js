// ─────────────────────────────────────────────────────────────────────────────
// Frontend Wizards — single source of truth for every real, cited number.
// Each stat references a source by id and links it inline, so nothing on the
// page is an unbacked claim.
// ─────────────────────────────────────────────────────────────────────────────

export const sources = {
  so2024: {
    label: 'Stack Overflow Developer Survey 2024',
    url: 'https://survey.stackoverflow.co/2024/',
  },
  stateofjs2024: {
    label: 'State of JavaScript 2024',
    url: 'https://2024.stateofjs.com/en-US/libraries/front-end-frameworks/',
  },
  bls2024: {
    label: 'U.S. Bureau of Labor Statistics — Web Developers (May 2024)',
    url: 'https://www.bls.gov/ooh/computer-and-information-technology/web-developers.htm',
  },
  glassdoor2025: {
    label: 'Glassdoor salary data (2025)',
    url: 'https://www.glassdoor.com/Salaries/front-end-developer-salary-SRCH_KO0,19.htm',
  },
  webaim2024: {
    label: 'WebAIM Million 2024',
    url: 'https://webaim.org/projects/million/',
  },
  netcraft2024: {
    label: 'Netcraft Web Server Survey (Dec 2024)',
    url: 'https://www.netcraft.com/blog/december-2024-web-server-survey/',
  },
  w3techs2025: {
    label: 'W3Techs (2025)',
    url: 'https://w3techs.com/technologies/',
  },
  loadstudies2024: {
    label: 'Page-speed abandonment research (industry studies, 2024)',
    url: 'https://www.thinkwithgoogle.com/marketing-strategies/app-and-mobile/page-load-time-statistics/',
  },
}

// "By the Numbers" — the count-up counters. `to` is the animated target,
// `format` shapes the display, `prefix`/`suffix` frame it.
export const stats = [
  {
    to: 95.9,
    suffix: '%',
    decimals: 1,
    label: 'of the web’s homepages fail accessibility checks',
    note: 'Avg. 56.8 errors per page. Wizards make sites everyone can use.',
    source: 'webaim2024',
  },
  {
    to: 135,
    prefix: '$',
    suffix: 'K',
    label: 'median total pay for a front-end developer (US)',
    note: 'BLS pegs the web-developer median at $90,930/yr.',
    source: 'so2024',
  },
  {
    to: 1.15,
    suffix: 'B',
    decimals: 2,
    label: 'websites exist for Wizards to enchant',
    note: '1,149,724,280 sites tracked in Dec 2024.',
    source: 'netcraft2024',
  },
  {
    to: 7,
    prefix: '+',
    suffix: '%',
    label: 'projected job growth, 2024–2034 (faster than average)',
    note: '~14,500 new openings every year.',
    source: 'bls2024',
  },
  {
    to: 73.6,
    suffix: '%',
    decimals: 1,
    label: 'of developers cast their spells in VS Code',
    note: 'The most-used editor on Earth.',
    source: 'so2024',
  },
  {
    to: 53,
    suffix: '%',
    label: 'of visitors flee a page that loads slower than 3 seconds',
    note: 'Speed is the deadliest spell of all.',
    source: 'loadstudies2024',
  },
]

// "The Arcane Stack" — real adoption numbers from the surveys.
export const stack = [
  { name: 'JavaScript', pct: 62.3, tag: 'the mother tongue', source: 'so2024' },
  { name: 'HTML / CSS', pct: 52.9, tag: 'the foundation runes', source: 'so2024' },
  { name: 'React', pct: 81.1, tag: 'most-used framework', source: 'stateofjs2024' },
  { name: 'TypeScript', pct: 38.5, tag: 'types that ward off bugs', source: 'so2024' },
  { name: 'Vue.js', pct: 51, tag: 'the gentle sorcerer', source: 'stateofjs2024' },
  { name: 'Angular', pct: 50.1, tag: 'enterprise enchantment', source: 'stateofjs2024' },
]

// "The Spells" — the bento grid of what the craft actually involves.
export const spells = [
  {
    icon: '📜',
    title: 'Semantic HTML',
    blurb: 'Structure that screen readers and search bots can actually read. The skeleton of every spell.',
  },
  {
    icon: '🎨',
    title: 'CSS Sorcery',
    blurb: 'Grid, flexbox, gradients & animation. Centering a div is still the hardest spell in the book.',
  },
  {
    icon: '⚡',
    title: 'JavaScript',
    blurb: 'Logic, state & interactivity — the lightning that brings a static page to life.',
  },
  {
    icon: '🧩',
    title: 'Components',
    blurb: 'React, Vue & friends. Reusable bits of magic you summon instead of rewriting.',
  },
  {
    icon: '🛡️',
    title: 'Accessibility',
    blurb: 'Building for keyboards, screen readers & everyone. 95.9% of sites get this wrong.',
  },
  {
    icon: '🚀',
    title: 'Performance',
    blurb: 'Shaving milliseconds so visitors never see a loading spinner. Every 100ms counts.',
  },
  {
    icon: '🪄',
    title: 'Animation',
    blurb: 'Scroll reveals, micro-interactions & particles — delight that respects reduced-motion.',
  },
  {
    icon: '🔮',
    title: 'Dev Tools',
    blurb: 'Git, browser DevTools & Figma. The wand, the scrying glass and the spellbook.',
  },
]

// "What's a Frontend Wizzard?" — three pillar cards.
export const pillars = [
  {
    icon: '✍️',
    label: 'The Incantations',
    title: 'They speak HTML, CSS & JavaScript',
    blurb:
      'Three ancient languages that, woven together, turn plain text into living interfaces in every browser on the planet.',
  },
  {
    icon: '⚗️',
    label: 'The Alchemy',
    title: 'They turn designs into reality',
    blurb:
      'Figma mockups become pixel-perfect, responsive, interactive pages — the same on a phone, a laptop and a giant TV.',
  },
  {
    icon: '🌟',
    label: 'The Enchantments',
    title: 'They make it fast & delightful',
    blurb:
      'Accessible to everyone, quick to load, smooth to use. Invisible craft that visitors feel but never notice.',
  },
]

// "A Day in the Grimoire" — humorous day-in-the-life timeline.
export const grimoire = [
  { time: '09:00', title: 'Decipher yesterday’s spell', text: 'Open the laptop, stare at the CSS you wrote yesterday, whisper “why is it centered like that.”' },
  { time: '10:00', title: 'Standup incantations', text: 'Tell the council what you summoned yesterday and what you’ll conjure today. Sip coffee. Sip more coffee.' },
  { time: '11:30', title: 'Alchemy with the designers', text: 'Translate a beautiful Figma file into real, responsive components. Argue gently about 2px of padding.' },
  { time: '14:00', title: 'Tame a wild bug', text: 'It works on your machine. It does not work in Safari. The oldest curse in the book.' },
  { time: '15:30', title: 'Particle effects & polish', text: 'Add the scroll animation, the hover glow, the little sparkle. This is the fun part. Obviously.' },
  { time: '17:00', title: 'Review & merge', text: 'Read a teammate’s spell, leave kind comments, approve, merge. Watch the tests pass. Exhale.' },
  { time: '17:30', title: 'Ship it ✨', text: 'Deploy to production. Refresh the live site. Marvel that millions of people can now click your magic.' },
]

// "From Apprentice to Archmage" — career ladder with real salary ranges.
export const ladder = [
  {
    rank: 'Apprentice',
    role: 'Junior Front-End Dev',
    years: '0–2 yrs',
    pay: '~$81K',
    text: 'Learning the runes — HTML, CSS, JS, Git. Fixing bugs, shipping small features, asking great questions.',
    source: 'glassdoor2025',
  },
  {
    rank: 'Adept',
    role: 'Mid-Level Dev',
    years: '2–5 yrs',
    pay: '~$102K',
    text: 'Owning whole features end-to-end. Reaching for frameworks, tests and APIs without a guiding hand.',
    source: 'glassdoor2025',
  },
  {
    rank: 'Sorcerer',
    role: 'Senior Dev',
    years: '5–7+ yrs',
    pay: '~$148K',
    text: 'Designing architecture, mentoring apprentices, making the hard performance & accessibility calls.',
    source: 'glassdoor2025',
  },
  {
    rank: 'Archmage',
    role: 'Lead / Staff Engineer',
    years: '7–10+ yrs',
    pay: '$150K–$250K+',
    text: 'Shaping the tech roadmap and lifting whole teams. The magic is now organizational as much as technical.',
    source: 'glassdoor2025',
  },
]

// Remote-work breakdown, used as a small flourish in the numbers section.
export const work = {
  remote: 42,
  hybrid: 42,
  onsite: 20,
  source: 'so2024',
}
