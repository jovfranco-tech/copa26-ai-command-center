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
  pitchZoneInsights: {
    stands: string;
    field: string;
    screens: string;
    lights: string;
  };
  analytics: {
    confidence: number; // 0 to 100
    tacticalRisk: number; // 0 to 100
    momentum: number[]; // 20 values between -100 (Away dominant) and 100 (Home dominant)
    storyline: string;
    whatToWatch: string[];
    strategyHome: string;
    strategyAway: string;
    heatZones: { x: number; y: number; r: number; val: number }[];
  };
}

export const MATCH_FIXTURES: Match[] = [
  {
    id: 'match-1',
    teams: {
      home: 'Argentina',
      away: 'Francia',
      homeShort: 'ARG',
      awayShort: 'FRA',
      homeColor: '#74acdf', // Azul claro
      awayColor: '#0f2042', // Azul profundo
      homeStandsColor: '#74acdf',
      awayStandsColor: '#0f2042',
    },
    stadiumName: 'Estadio Lusail',
    group: 'Final reimaginada',
    timeOfDay: 'day',
    weather: 'clear',
    status: 'live',
    score: { home: 3, away: 2 },
    liveTime: "82'",
    spectators: '88,966 (100% de capacidad)',
    pitchZoneInsights: {
      stands: 'La afición argentina domina la curva sur, desatando cánticos ensordecedores. Los hinchas franceses en la tribuna norte lucen tensos pero expectantes.',
      field: 'Combate intenso en el mediocampo. Argentina explota los espacios interiores en la Zona 14. Francia responde con transiciones veloces por las bandas.',
      screens: 'Mostrando repetición táctica del último gol: una secuencia rápida de pases al primer toque que culminó en volea cruzada.',
      lights: 'Iluminación a máxima capacidad. Reflectores de 2,000 lux proyectan sombras nítidas, destacando el esfuerzo físico de los jugadores en cada sprint.',
    },
    analytics: {
      confidence: 88,
      tacticalRisk: 75,
      momentum: [20, 45, 60, 30, -10, -40, -65, -80, -30, 10, 40, 50, 70, 85, 90, 60, 20, -10, 40, 65],
      storyline: 'Una epopeya emocionante. Tras ir ganando 2-0, Argentina concedió dos goles en 90 segundos. Una brillante jugada colectiva vuelve a poner a la Albiceleste al frente, pero la ofensiva de Mbappé sigue siendo una amenaza latente.',
      whatToWatch: [
        'Messi encontrando bolsillos de espacio libre entre las líneas defensivas francesas.',
        'Los duelos individuales de Mbappé en el extremo izquierdo explotando el retroceso rival.',
        'Los niveles de fatiga en la presión alta de Argentina durante los minutos finales.'
      ],
      strategyHome: '4-3-3 Ofensivo de Posesión, Sobrecarga en la Banda Derecha',
      strategyAway: '4-2-3-1 Contraataque de Alta Velocidad, Transiciones Verticales',
      heatZones: [
        { x: -10, y: 15, r: 8, val: 0.9 }, // Acción local
        { x: -15, y: -10, r: 6, val: 0.7 },
        { x: 5, y: 5, r: 9, val: 0.8 }, // Mediocampo intenso
        { x: 25, y: 20, r: 7, val: 0.95 }, // Extremo izquierdo Francia
        { x: -28, y: -5, r: 5, val: 0.6 }
      ]
    }
  },
  {
    id: 'match-2',
    teams: {
      home: 'Brasil',
      away: 'Alemania',
      homeShort: 'BRA',
      awayShort: 'GER',
      homeColor: '#fed103', // Amarillo Canario
      awayColor: '#ffffff', // Blanco Limpio
      homeStandsColor: '#009b3a', // Tribuna Verde
      awayStandsColor: '#d2143a', // Tribuna Negra-Roja-Oro
    },
    stadiumName: 'Estadio Maracaná',
    group: 'Grupo A - Jornada 1',
    timeOfDay: 'sunset',
    weather: 'rain',
    status: 'pre-match',
    score: { home: 0, away: 0 },
    spectators: '74,738 espectadores previstos',
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
      storyline: 'El clásico de las revanchas. Jugando ante la apasionada afición del Maracaná, Brasil busca redención histórica ante la disciplinada táctica alemana en una tarde de lluvia impredecible.',
      whatToWatch: [
        'La acumulación de agua cerca de las bandas que ralentiza los regates de los extremos brasileños.',
        'El bloque de doble pivote alemán frustrando la gestación de juego creativo de Neymar.',
        'La efectividad en táctica fija/balón parado bajo las condiciones de lluvia.'
      ],
      strategyHome: '4-2-4 Jogo Bonito Absoluto, Extremos Cortando hacia el Interior',
      strategyAway: '3-5-2 Disciplina Posicional, Bloque Bajo y Delantero Centro Objetivo',
      heatZones: [
        { x: 0, y: 0, r: 12, val: 0.5 }, // Construcción media
        { x: -20, y: 15, r: 7, val: 0.3 },
        { x: 20, y: -15, r: 7, val: 0.4 }
      ]
    }
  },
  {
    id: 'match-3',
    teams: {
      home: 'España',
      away: 'Países Bajos',
      homeShort: 'ESP',
      awayShort: 'NED',
      homeColor: '#c60b1e', // Rojo Furia
      awayColor: '#ff4f00', // Naranja Mecánica
      homeStandsColor: '#fed103', // Amarillo Oro
      awayStandsColor: '#ffffff',
    },
    stadiumName: 'Johan Cruyff Arena',
    group: 'Grupo C - Jornada 3',
    timeOfDay: 'day',
    weather: 'fog',
    status: 'post-match',
    score: { home: 1, away: 3 },
    spectators: '54,000 espectadores (Lleno total)',
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
        'La contundencia de Países Bajos aprovechando los centros laterales.'
      ],
      strategyHome: '4-3-3 Tiki-Taka de Posesión Extrema, Pases Cortos en Rombo',
      strategyAway: '5-3-2 Carrileros de Largo Recorrido, Transición Vertical Directa',
      heatZones: [
        { x: -5, y: 0, r: 15, val: 0.95 }, // Posesión densa española en medio campo
        { x: 28, y: 0, r: 10, val: 0.8 }, // Zona de contraataque holandés
        { x: -28, y: -10, r: 4, val: 0.2 }
      ]
    }
  }
];
