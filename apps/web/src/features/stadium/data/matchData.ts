/**
 * matchData.ts — Stadium analytics layer.
 *
 * The real match schedule comes from useMatches() / worldcup2026.json.
 * This file provides:
 *   - Narrative analytics for curated "demo" matches (MEX-RSA inaugural, ARG-FRA, BRA-GER, ESP-NED)
 *   - Placeholder analytics for all other real matches ("Datos pendientes")
 *   - MATCH_FIXTURES as emergency fallback if the real data API is unavailable
 *
 * Uso personal/privado — visualización no oficial — sin afiliación FIFA.
 */
import type { MatchAnalytics, PitchZoneInsights } from '@worldcup/shared';

export type { MatchAnalytics, PitchZoneInsights };

export interface Match {
  id: string;
  teams: {
    home: string;
    away: string;
    homeShort: string;
    awayShort: string;
    homeColor: string;
    awayColor: string;
    homeStandsColor: string;
    awayStandsColor: string;
  };
  stadiumName: string;
  group: string;
  timeOfDay: 'day' | 'sunset' | 'night';
  weather: 'clear' | 'rain' | 'snow' | 'fog';
  status: 'pre-match' | 'live' | 'post-match';
  score: {
    home: number;
    away: number;
  };
  liveTime?: string;
  spectators: string;
  formations?: { home: string; away: string };
  mvp?: string;
  pitchZoneInsights: PitchZoneInsights;
  /** English variant of pitchZoneInsights, shown when the active language is 'en'. */
  pitchZoneInsightsEn?: PitchZoneInsights;
  analytics: MatchAnalytics;
  /** true when pitchZoneInsights/analytics come from curated demo data */
  isDemo?: boolean;
  /** true when analytics are placeholders ("Datos pendientes") */
  isPending?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder analytics for non-demo real matches
// ─────────────────────────────────────────────────────────────────────────────

export const PLACEHOLDER_INSIGHTS: PitchZoneInsights = {
  stands: 'Información de ambiente y afición disponible próximamente.',
  field: 'Análisis táctico del terreno de juego — datos pendientes.',
  screens: 'Estadísticas y transmisión — pendiente de inicio del partido.',
  lights: 'Condiciones de iluminación — disponibles al acercarse el partido.',
};

export const PLACEHOLDER_INSIGHTS_EN: PitchZoneInsights = {
  stands: 'Atmosphere and crowd information available soon.',
  field: 'Tactical pitch analysis — data pending.',
  screens: 'Stats and broadcast — pending match kick-off.',
  lights: 'Lighting conditions — available as the match approaches.',
};

/**
 * English variants of the curated demo pitch-zone insights, keyed by "HOME-AWAY".
 * Kept parallel to DEMO_MATCH_ANALYTICS so the rich Spanish prose stays untouched.
 */
export const DEMO_PITCH_INSIGHTS_EN: Record<string, PitchZoneInsights> = {
  'MEX-RSA': {
    stands: 'The Santa Úrsula colossus roars with Mexico’s chant and the buzz of South African vuvuzelas behind the goals. A spectacular tricolour mosaic fills the east stand.',
    field: 'Mexico presses high to suffocate the build-up. South Africa exploits pace down the flanks on the fast turf.',
    screens: 'Showing replay: a powerful header from Santiago Giménez onto a precise cross from the right wing.',
    lights: 'An electric atmosphere under the sky of the Mexican capital. The LED lighting brings out the deep green of the pitch.',
  },
  'ARG-FRA': {
    stands: 'The Argentine support owns the south curve with deafening chants. The French fans in the north stand look tense but expectant.',
    field: 'Intense midfield battle. Argentina exploits the interior spaces in Zone 14. France replies with quick wide transitions.',
    screens: 'Showing tactical replay of the last goal: a rapid one-touch passing sequence finished with a crossed volley.',
    lights: 'Floodlights at full power. Reflectors cast sharp shadows, highlighting the physical effort of the players on every sprint.',
  },
  'BRA-GER': {
    stands: 'The stands turn green and yellow with smoke and massed batucadas. The German support packs in tightly behind the north goal.',
    field: 'Fast, slick turf from the heavy tropical rain. Slide tackles will be high-risk but high-reward.',
    screens: 'Pre-match graphics showing the lineups: Brazil deploy a hugely attacking 4-2-4; Germany reply with an orderly 3-5-2.',
    lights: 'The sunset flashes golden tones through the clouds. The stadium light ring glows with green and yellow accents.',
  },
  'ESP-NED': {
    stands: 'Effusive Dutch celebrations in the east end. The Spanish section stays quiet, poring over the final stats of the match.',
    field: 'Spain held 72% possession but could not break the low block. The Netherlands struck three times vertically on transitions.',
    screens: 'Final Score: SPAIN 1 - 3 NETHERLANDS. Replay highlighting Van Persie’s spectacular diving header.',
    lights: 'The shadows of the day dissolve under thick fog. The stadium’s powerful floodlights cut through the mist with white halos.',
  },
};

export const PLACEHOLDER_ANALYTICS: MatchAnalytics = {
  confidence: 50,
  tacticalRisk: 50,
  momentum: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  storyline: 'Alineación estimada. Análisis narrativo disponible próximamente — datos del partido pendientes.',
  whatToWatch: [
    'Análisis táctico en preparación.',
    'Datos estadísticos disponibles cuando comience el partido.',
    'Seguimiento en tiempo real activado al inicio del torneo.',
  ],
  strategyHome: 'Formación y estrategia — Calendario local',
  strategyAway: 'Formación y estrategia — Calendario local',
  heatZones: [
    { x: 0, y: 0, r: 10, val: 0.3 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Curated demo analytics — keyed by "HOME-AWAY" team code pair
// ─────────────────────────────────────────────────────────────────────────────

interface DemoAnalyticsEntry {
  pitchZoneInsights: PitchZoneInsights;
  analytics: MatchAnalytics;
}

export const DEMO_MATCH_ANALYTICS: Record<string, DemoAnalyticsEntry> = {
  'MEX-RSA': {
    pitchZoneInsights: {
      stands: 'El coloso de Santa Úrsula retumba con el grito de México y el vibrar de las vuvuzelas sudafricanas en las cabeceras. Mosaico tricolor espectacular en la tribuna este.',
      field: 'México presiona alto buscando asfixiar la salida. Sudáfrica explota la velocidad por las bandas aprovechando el césped rápido.',
      screens: 'Mostrando repetición: gran remate de cabeza de Santiago Giménez a centro preciso desde la banda derecha.',
      lights: 'Atmósfera electrizante bajo el cielo de la capital mexicana. La iluminación LED resalta el verde intenso del terreno de juego.',
    },
    analytics: {
      confidence: 82,
      tacticalRisk: 65,
      momentum: [10, 15, 30, 45, 20, -5, -15, 10, 35, 55, 60, 40, 20, -10, 15, 45, 50, 25, 35, 40],
      storyline: 'Partido inaugural histórico. México domina la posesión y se pone al frente, pero Sudáfrica muestra peligro latente con sus descolgadas verticales y velocidad.',
      whatToWatch: [
        'Edson Álvarez controlando el ritmo y la recuperación en el mediocampo.',
        'Las descolgadas veloces de Percy Tau a las espaldas de los laterales mexicanos.',
        'Luis Chávez buscando disparos de media distancia ante el bloque compacto rival.',
      ],
      strategyHome: '4-3-3 Presión Alta, Posesión en Campo Rival y Laterales Ofensivos',
      strategyAway: '4-3-3 Bloque Medio-Bajo, Transición Rápida y Extremos Explosivos',
      heatZones: [
        { x: -5, y: -10, r: 8, val: 0.8 },
        { x: -12, y: 12, r: 7, val: 0.7 },
        { x: 15, y: 5, r: 9, val: 0.85 },
        { x: -25, y: 0, r: 6, val: 0.9 },
        { x: 5, y: -15, r: 8, val: 0.75 },
      ],
    },
  },
  'ARG-FRA': {
    pitchZoneInsights: {
      stands: 'La afición argentina domina la curva sur con cánticos ensordecedores. Los hinchas franceses en la tribuna norte lucen tensos pero expectantes.',
      field: 'Combate intenso en el mediocampo. Argentina explota los espacios interiores en la Zona 14. Francia responde con transiciones veloces por las bandas.',
      screens: 'Mostrando repetición táctica del último gol: una secuencia rápida de pases al primer toque que culminó en volea cruzada.',
      lights: 'Iluminación a máxima capacidad. Reflectores proyectan sombras nítidas, destacando el esfuerzo físico de los jugadores en cada sprint.',
    },
    analytics: {
      confidence: 88,
      tacticalRisk: 75,
      momentum: [20, 45, 60, 30, -10, -40, -65, -80, -30, 10, 40, 50, 70, 85, 90, 60, 20, -10, 40, 65],
      storyline: 'Una epopeya emocionante. Tras ir ganando 2-0, Argentina concedió dos goles en 90 segundos. Una brillante jugada colectiva vuelve a poner a la Albiceleste al frente, pero la ofensiva de Mbappé sigue siendo una amenaza latente.',
      whatToWatch: [
        'Messi encontrando bolsillos de espacio libre entre las líneas defensivas francesas.',
        'Los duelos individuales de Mbappé en el extremo izquierdo explotando el retroceso rival.',
        'Los niveles de fatiga en la presión alta de Argentina durante los minutos finales.',
      ],
      strategyHome: '4-3-3 Ofensivo de Posesión, Sobrecarga en la Banda Derecha',
      strategyAway: '4-2-3-1 Contraataque de Alta Velocidad, Transiciones Verticales',
      heatZones: [
        { x: -10, y: 15, r: 8, val: 0.9 },
        { x: -15, y: -10, r: 6, val: 0.7 },
        { x: 5, y: 5, r: 9, val: 0.8 },
        { x: 25, y: 20, r: 7, val: 0.95 },
        { x: -28, y: -5, r: 5, val: 0.6 },
      ],
    },
  },
  'BRA-GER': {
    pitchZoneInsights: {
      stands: 'Las gradas se tiñen de humo verde y amarillo con batucadas masivas. La porra alemana se concentra de forma compacta detrás de la portería norte.',
      field: 'Césped rápido y resbaladizo debido a la fuerte lluvia tropical. Los barridos serán de alto riesgo pero alta efectividad.',
      screens: 'Gráficas previas mostrando alineaciones: Brasil despliega un 4-2-4 sumamente ofensivo; Alemania responde con un ordenado 3-5-2.',
      lights: 'El atardecer destella tonos dorados a través de las nubes. El anillo de luces del estadio se enciende con acentos verdes y amarillos.',
    },
    analytics: {
      confidence: 62,
      tacticalRisk: 40,
      momentum: [5, 10, 5, -5, -10, -12, -8, 2, 10, 15, -2, -8, -15, -5, 5, 8, 12, 15, 10, 5],
      storyline: 'El clásico de las revanchas. Jugando ante la apasionada afición, Brasil busca redención histórica ante la disciplinada táctica alemana en una tarde de lluvia impredecible.',
      whatToWatch: [
        'La acumulación de agua cerca de las bandas que ralentiza los regates de los extremos brasileños.',
        'El bloque de doble pivote alemán frustrando la gestación de juego creativo de Neymar.',
        'La efectividad en táctica fija/balón parado bajo las condiciones de lluvia.',
      ],
      strategyHome: '4-2-4 Jogo Bonito Absoluto, Extremos Cortando hacia el Interior',
      strategyAway: '3-5-2 Disciplina Posicional, Bloque Bajo y Delantero Centro Objetivo',
      heatZones: [
        { x: 0, y: 0, r: 12, val: 0.5 },
        { x: -20, y: 15, r: 7, val: 0.3 },
        { x: 20, y: -15, r: 7, val: 0.4 },
      ],
    },
  },
  'ESP-NED': {
    pitchZoneInsights: {
      stands: 'Festejos neerlandeses efusivos en la cabecera este. El sector español permanece en silencio, analizando las estadísticas finales del encuentro.',
      field: 'España mantuvo un 72% de posesión pero no logró romper el repliegue defensivo. Países Bajos golpeó tres veces de manera vertical en transiciones.',
      screens: 'Marcador Final: ESPAÑA 1 - 3 PAÍSES BAJOS. Repetición destacando el espectacular cabezazo palomita de Van Persie.',
      lights: 'Las sombras del día se disuelven bajo una densa niebla. Los potentes reflectores del estadio cortan la bruma con halos blancos.',
    },
    analytics: {
      confidence: 95,
      tacticalRisk: 85,
      momentum: [15, 25, 45, 55, 60, 40, -10, -35, -45, -30, 20, 30, 45, 50, 20, -20, -55, -80, -95, -99],
      storyline: 'Cátedra de juego vertical y transiciones letales. España monopolizó el balón pero fue vulnerable a las descolgadas veloces. El sistema de carrileros holandeses asfixió por completo el tiki-taka español en el complemento.',
      whatToWatch: [
        'El sistema dinámico de carrileros neerlandeses exponiendo a la zaga central de España.',
        'La velocidad de recuperación tras pérdidas de balón en el tercio medio español.',
        'La contundencia de Países Bajos aprovechando los centros laterales.',
      ],
      strategyHome: '4-3-3 Tiki-Taka de Posesión Extrema, Pases Cortos en Rombo',
      strategyAway: '5-3-2 Carrileros de Largo Recorrido, Transición Vertical Directa',
      heatZones: [
        { x: -5, y: 0, r: 15, val: 0.95 },
        { x: 28, y: 0, r: 10, val: 0.8 },
        { x: -28, y: -10, r: 4, val: 0.2 },
      ],
    },
  },
};

/**
 * Returns curated demo analytics for a known team pair, or placeholder analytics otherwise.
 */
export function getDemoAnalytics(homeCode: string, awayCode: string): { entry: DemoAnalyticsEntry | null; isDemo: boolean } {
  const key = `${homeCode.toUpperCase()}-${awayCode.toUpperCase()}`;
  const entry = DEMO_MATCH_ANALYTICS[key] ?? null;
  return { entry, isDemo: !!entry };
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH_FIXTURES — emergency/offline fallback only.
// When the real API is available, App.tsx uses useMatches() instead.
// These 4 matches align with the curated demo analytics above.
// ─────────────────────────────────────────────────────────────────────────────

export const MATCH_FIXTURES: Match[] = [
  {
    id: 'M001',
    teams: {
      home: 'México',
      away: 'Sudáfrica',
      homeShort: 'MEX',
      awayShort: 'RSA',
      homeColor: '#006341',
      awayColor: '#ffb612',
      homeStandsColor: '#006341',
      awayStandsColor: '#007a4d',
    },
    stadiumName: 'Estadio Azteca',
    group: 'Group A · Matchday 1',
    timeOfDay: 'day',
    weather: 'clear',
    status: 'pre-match',
    score: { home: 0, away: 0 },
    spectators: '83,000 (Estadio Azteca)',
    pitchZoneInsights: DEMO_MATCH_ANALYTICS['MEX-RSA'].pitchZoneInsights,
    pitchZoneInsightsEn: DEMO_PITCH_INSIGHTS_EN['MEX-RSA'],
    analytics: DEMO_MATCH_ANALYTICS['MEX-RSA'].analytics,
    isDemo: true,
  },
  {
    id: 'match-arg-fra',
    teams: {
      home: 'Argentina',
      away: 'Francia',
      homeShort: 'ARG',
      awayShort: 'FRA',
      homeColor: '#74acdf',
      awayColor: '#071f4e',
      homeStandsColor: '#74acdf',
      awayStandsColor: '#0f2042',
    },
    stadiumName: 'MetLife Stadium',
    group: 'Visualización no oficial — Modo demo',
    timeOfDay: 'day',
    weather: 'clear',
    status: 'live',
    score: { home: 3, away: 2 },
    liveTime: "82'",
    spectators: '82,500 (MetLife Stadium)',
    pitchZoneInsights: DEMO_MATCH_ANALYTICS['ARG-FRA'].pitchZoneInsights,
    pitchZoneInsightsEn: DEMO_PITCH_INSIGHTS_EN['ARG-FRA'],
    analytics: DEMO_MATCH_ANALYTICS['ARG-FRA'].analytics,
    isDemo: true,
  },
  {
    id: 'match-bra-ger',
    teams: {
      home: 'Brasil',
      away: 'Alemania',
      homeShort: 'BRA',
      awayShort: 'GER',
      homeColor: '#fed103',
      awayColor: '#ffffff',
      homeStandsColor: '#009b3a',
      awayStandsColor: '#d2143a',
    },
    stadiumName: 'NRG Stadium',
    group: 'Visualización no oficial — Modo demo',
    timeOfDay: 'sunset',
    weather: 'rain',
    status: 'pre-match',
    score: { home: 0, away: 0 },
    spectators: '72,000 (NRG Stadium)',
    pitchZoneInsights: DEMO_MATCH_ANALYTICS['BRA-GER'].pitchZoneInsights,
    pitchZoneInsightsEn: DEMO_PITCH_INSIGHTS_EN['BRA-GER'],
    analytics: DEMO_MATCH_ANALYTICS['BRA-GER'].analytics,
    isDemo: true,
  },
  {
    id: 'match-esp-ned',
    teams: {
      home: 'España',
      away: 'Países Bajos',
      homeShort: 'ESP',
      awayShort: 'NED',
      homeColor: '#c60b1e',
      awayColor: '#ff4f00',
      homeStandsColor: '#fed103',
      awayStandsColor: '#ffffff',
    },
    stadiumName: 'AT&T Stadium',
    group: 'Visualización no oficial — Modo demo',
    timeOfDay: 'day',
    weather: 'fog',
    status: 'post-match',
    score: { home: 1, away: 3 },
    spectators: '94,000 (AT&T Stadium)',
    pitchZoneInsights: DEMO_MATCH_ANALYTICS['ESP-NED'].pitchZoneInsights,
    pitchZoneInsightsEn: DEMO_PITCH_INSIGHTS_EN['ESP-NED'],
    analytics: DEMO_MATCH_ANALYTICS['ESP-NED'].analytics,
    isDemo: true,
  },
];
