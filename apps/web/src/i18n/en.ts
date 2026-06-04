/**
 * English dictionary. MUST mirror the key shape of es.ts.
 * Professional, premium sports tone — not literal.
 */
import type { Dict } from './es';

export const en: Dict = {
  lang: { es: 'Spanish', en: 'English', label: 'Language' },

  nav: {
    groupCommand: 'Command center',
    groupExplore: 'Explore',
    groupPersonal: 'Personal',
    home: 'Dashboard',
    matches: 'Matches',
    tv: 'TV Mode',
    bracket: 'Knockouts',
    teams: 'National Teams',
    players: 'Players',
    standings: 'Groups & Table',
    stats: 'Stats',
    stadium: '3D Stadium',
    venues: 'Venues',
    pool: 'Pool',
    favorites: 'Favorites',
    data: 'Data',
    analyst: 'AI Analyst',
  },

  titles: {
    home: 'Dashboard',
    matches: 'Match Center',
    tv: 'TV Mode',
    bracket: 'Knockouts',
    teams: 'National Teams',
    players: 'Players',
    standings: 'Groups & Standings',
    stats: 'Stats',
    venues: 'Venues',
    favorites: 'Favorites',
    pool: 'Pool',
    data: 'Data Center',
    analyst: 'AI Match Analyst',
    stadium: '3D Stadium',
  },

  role: {
    admin: 'Admin',
    family: 'Standard',
    guest: 'Guest',
    label: 'Usage role',
    active: 'Active role',
  },

  common: {
    search: 'Search players, clubs…',
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    share: 'Share',
    retry: 'Retry',
    back: 'Back',
    viewMatch: 'View match',
    skipToContent: 'Skip to main content',
    installApp: 'Install app',
    live: 'LIVE',
    menu: 'Menu',
    logout: 'Sign out',
    dataBadge: 'Data',
  },

  states: {
    offline: 'Offline — showing cached data.',
    offlineTitle: 'Offline mode active',
    offlineBody: 'Your predictions are saved locally and will sync once you are back online.',
    errorTitle: 'Unexpected error',
    errorBody: 'Something went wrong loading this section. Try reloading the page.',
    reload: 'Reload page',
    empty: 'No data yet',
  },

  footer: {
    brand: 'Copa 2026 · AI Command Center',
    tagline: 'Personal project · no official affiliation.',
    calendar: 'Tournament calendar',
    privateNote: 'Private dashboard.',
    notForDistribution: 'Not for public distribution.',
  },

  data: {
    simulated: 'Simulated data',
    estimated: 'Estimated data',
    official: 'Official data',
    derived: 'Derived data',
    pending: 'Pending',
    mockBanner: 'Demo data — replaced with real data once matches are played.',
  },

  disclaimer: {
    full: 'This is a private/unofficial demo. It is not affiliated with, endorsed by, or authorized by FIFA, federations, national teams, leagues, players, or official brands. Some data may be simulated, estimated, or manually curated for demonstration purposes.',
    footer: 'Unofficial · not affiliated with FIFA · tournament calendar.',
    unofficial: 'Unofficial',
    notAffiliated: 'Not affiliated',
    personalDemo: 'Personal use / demo',
  },

  ai: {
    assistant: 'AI Assistant',
    analysis: 'AI Analysis',
    generated: 'AI-generated',
    generatedAnalysis: 'AI-generated analysis',
    simulatedPrediction: 'Simulated prediction',
    curatedData: 'Manually curated data',
    notOfficialSource: 'Do not use as an official source',
    estimatedConfidence: 'Estimated confidence',
    prediction: 'Prediction',
    matchBrief: 'Match Brief',
    tacticalView: 'Tactical View',
  },

  lineup: {
    lineup: 'Lineup',
    official: 'Official XI',
    estimated: 'Estimated XI',
    partial: 'Official XI · partial',
  },
};
