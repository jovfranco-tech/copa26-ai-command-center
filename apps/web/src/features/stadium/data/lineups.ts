export interface Player {
  id: string;
  name: string;
  displayName: string;
  number: number;
  team: 'ARG' | 'FRA';
  position: 'GK' | 'DF' | 'MF' | 'FW';
  positionLabel: string; // e.g., 'Portero', 'Defensa Central', 'Mediocampista'
  tacticalRole: string;
  x: number; // 3D coordinates on pitch length [-33 to 33]
  z: number; // 3D coordinates on pitch width [-23 to 23]
  influenceScore: number; // 0 to 100
  stamina: number; // 0 to 100
  riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  notes: string;
  pos?: string;
  club?: string;
  age?: number | null;
}

export interface TeamLineup {
  teamCode: 'ARG' | 'FRA';
  teamName: string;
  color: string;
  standsColor: string;
  formation: string;
  manager: string;
  players: Player[];
}

export interface MatchLineups {
  matchId: string;
  minute: number;
  status: string;
  teams: {
    home: TeamLineup;
    away: TeamLineup;
  };
}

export const MATCH_LINEUPS: MatchLineups = {
  matchId: 'match-1',
  minute: 82,
  status: 'live',
  teams: {
    home: {
      teamCode: 'ARG',
      teamName: 'Argentina',
      color: '#74acdf',
      standsColor: '#74acdf',
      formation: '4-3-3',
      manager: 'Lionel Scaloni',
      players: [
        {
          id: 'arg-gk',
          name: 'Emiliano Martínez',
          displayName: 'E. Martínez',
          number: 23,
          team: 'ARG',
          position: 'GK',
          positionLabel: 'Portero',
          tacticalRole: 'Portero de Línea y Cierre',
          x: -28,
          z: 0,
          influenceScore: 78,
          stamina: 95,
          riskLevel: 'bajo',
          notes: 'Posicionamiento agresivo en centros y alta efectividad en achiques directos.'
        },
        {
          id: 'arg-rb',
          name: 'Nahuel Molina',
          displayName: 'Molina',
          number: 16,
          team: 'ARG',
          position: 'DF',
          positionLabel: 'Lateral Derecho',
          tacticalRole: 'Carrilero de Proyección',
          x: -15,
          z: -13,
          influenceScore: 68,
          stamina: 74,
          riskLevel: 'medio',
          notes: 'Proyecciones profundas por banda derecha, con desdoblamientos constantes de Di María.'
        },
        {
          id: 'arg-cb-r',
          name: 'Cristian Romero',
          displayName: 'Romero',
          number: 13,
          team: 'ARG',
          position: 'DF',
          positionLabel: 'Defensa Central',
          tacticalRole: 'Defensa Tapón Agresivo',
          x: -20,
          z: -6,
          influenceScore: 82,
          stamina: 80,
          riskLevel: 'alto',
          notes: 'Presión física alta sobre Giroud. Propensión al anticipo agresivo en tres cuartos.'
        },
        {
          id: 'arg-cb-l',
          name: 'Nicolás Otamendi',
          displayName: 'Otamendi',
          number: 19,
          team: 'ARG',
          position: 'DF',
          positionLabel: 'Defensa Central',
          tacticalRole: 'Defensa de Cobertura',
          x: -20,
          z: 6,
          influenceScore: 79,
          stamina: 70,
          riskLevel: 'medio',
          notes: 'Liderazgo en bloque bajo. Encargado de coberturas a las espaldas de Tagliafico.'
        },
        {
          id: 'arg-lb',
          name: 'Nicolás Tagliafico',
          displayName: 'Tagliafico',
          number: 3,
          team: 'ARG',
          position: 'DF',
          positionLabel: 'Lateral Izquierdo',
          tacticalRole: 'Lateral Defensivo Invertido',
          x: -15,
          z: 13,
          influenceScore: 65,
          stamina: 76,
          riskLevel: 'bajo',
          notes: 'Mantiene vigilancias defensivas estrechas ante descolgadas rápidas de Dembélé.'
        },
        {
          id: 'arg-cm-r',
          name: 'Rodrigo De Paul',
          displayName: 'De Paul',
          number: 7,
          team: 'ARG',
          position: 'MF',
          positionLabel: 'Mediocampista',
          tacticalRole: 'Interior Box-to-Box',
          x: -7,
          z: -6,
          influenceScore: 81,
          stamina: 78,
          riskLevel: 'medio',
          notes: 'Despliegue físico incesante en coberturas por derecha y auxilio en la salida de Molina.'
        },
        {
          id: 'arg-dm',
          name: 'Enzo Fernández',
          displayName: 'Fernández',
          number: 24,
          team: 'ARG',
          position: 'MF',
          positionLabel: 'Mediocentro',
          tacticalRole: 'Pivote Organizador',
          x: -11,
          z: 0,
          influenceScore: 86,
          stamina: 82,
          riskLevel: 'bajo',
          notes: 'Distribuidor principal de juego en Zona 14. Eje de transiciones y repliegues centralizados.'
        },
        {
          id: 'arg-cm-l',
          name: 'Alexis Mac Allister',
          displayName: 'Mac Allister',
          number: 20,
          team: 'ARG',
          position: 'MF',
          positionLabel: 'Mediocampista',
          tacticalRole: 'Interior Creativo / Enlace',
          x: -7,
          z: 6,
          influenceScore: 84,
          stamina: 75,
          riskLevel: 'bajo',
          notes: 'Asociación constante con Messi en carril izquierdo y rupturas al área desde segunda línea.'
        },
        {
          id: 'arg-rw',
          name: 'Ángel Di María',
          displayName: 'Di María',
          number: 11,
          team: 'ARG',
          position: 'FW',
          positionLabel: 'Extremo Derecho',
          tacticalRole: 'Extremo Puro de Amplitud',
          x: -4,
          z: -16,
          influenceScore: 88,
          stamina: 62,
          riskLevel: 'alto',
          notes: 'Generador de desequilibrio individual por banda. Fatiga notable en repliegues tácticos.'
        },
        {
          id: 'arg-st',
          name: 'Julián Álvarez',
          displayName: 'Álvarez',
          number: 9,
          team: 'ARG',
          position: 'FW',
          positionLabel: 'Delantero Centro',
          tacticalRole: 'Presionador de Salida',
          x: -4,
          z: -2,
          influenceScore: 76,
          stamina: 72,
          riskLevel: 'medio',
          notes: 'Primer defensor en salida. Arrastra marcas de Upamecano para habilitar llegadas sorpresivas.'
        },
        {
          id: 'arg-ss',
          name: 'Lionel Messi',
          displayName: 'Messi',
          number: 10,
          team: 'ARG',
          position: 'FW',
          positionLabel: 'Mediapunta / Creador',
          tacticalRole: 'Organizador Libre Dinámico',
          x: -2,
          z: 9,
          influenceScore: 95,
          stamina: 84,
          riskLevel: 'bajo',
          notes: 'Recibe entre líneas en tres cuartos. Atrae marcas dobles y asiste hacia pasillos interiores.'
        }
      ]
    },
    away: {
      teamCode: 'FRA',
      teamName: 'Francia',
      color: '#0f2042',
      standsColor: '#0f2042',
      formation: '4-2-3-1',
      manager: 'Didier Deschamps',
      players: [
        {
          id: 'fra-gk',
          name: 'Mike Maignan',
          displayName: 'Maignan',
          number: 16,
          team: 'FRA',
          position: 'GK',
          positionLabel: 'Portero',
          tacticalRole: 'Portero Líbano de Distribución',
          x: 28,
          z: 0,
          influenceScore: 80,
          stamina: 98,
          riskLevel: 'bajo',
          notes: 'Excelente juego de pies para saltar líneas de presión y coberturas fuera del área.'
        },
        {
          id: 'fra-rb',
          name: 'Jules Koundé',
          displayName: 'Koundé',
          number: 5,
          team: 'FRA',
          position: 'DF',
          positionLabel: 'Lateral Derecho',
          tacticalRole: 'Lateral de Cierre Tercer Central',
          x: 16,
          z: 13,
          influenceScore: 72,
          stamina: 85,
          riskLevel: 'bajo',
          notes: 'Posicionamiento conservador en ataque. Apoyo defensivo a Upamecano ante Messi.'
        },
        {
          id: 'fra-cb-r',
          name: 'Dayot Upamecano',
          displayName: 'Upamecano',
          number: 4,
          team: 'FRA',
          position: 'DF',
          positionLabel: 'Defensa Central',
          tacticalRole: 'Defensa Marcador de Choque',
          x: 21,
          z: 6,
          influenceScore: 75,
          stamina: 82,
          riskLevel: 'medio',
          notes: 'Duelos aéreos dominantes contra Álvarez. Cierta vulnerabilidad en pases filtrados a su espalda.'
        },
        {
          id: 'fra-cb-l',
          name: 'William Saliba',
          displayName: 'Saliba',
          number: 17,
          team: 'FRA',
          position: 'DF',
          positionLabel: 'Defensa Central',
          tacticalRole: 'Defensa Escudo de Anticipación',
          x: 21,
          z: -6,
          influenceScore: 84,
          stamina: 88,
          riskLevel: 'bajo',
          notes: 'Excelente lectura posicional y velocidad de recuperación ante contragolpes de Argentina.'
        },
        {
          id: 'fra-lb',
          name: 'Theo Hernández',
          displayName: 'T. Hernández',
          number: 22,
          team: 'FRA',
          position: 'DF',
          positionLabel: 'Lateral Izquierdo',
          tacticalRole: 'Carrilero Ofensivo de Transición',
          x: 14,
          z: -13,
          influenceScore: 79,
          stamina: 80,
          riskLevel: 'alto',
          notes: 'Avances verticales constantes en banda izquierda. Deja espacios libres que ataca Di María.'
        },
        {
          id: 'fra-dm-r',
          name: 'Aurélien Tchouaméni',
          displayName: 'Tchouaméni',
          number: 8,
          team: 'FRA',
          position: 'MF',
          positionLabel: 'Mediocentro Defensivo',
          tacticalRole: 'Pivote Ancla Destructor',
          x: 11,
          z: -4,
          influenceScore: 83,
          stamina: 84,
          riskLevel: 'bajo',
          notes: 'Corte de líneas de pase y coberturas sobre zona central de recuperación.'
        },
        {
          id: 'fra-dm-l',
          name: 'Adrien Rabiot',
          displayName: 'Rabiot',
          number: 14,
          team: 'FRA',
          position: 'MF',
          positionLabel: 'Mediocentro',
          tacticalRole: 'Pivote Mixto de Salida',
          x: 11,
          z: 4,
          influenceScore: 78,
          stamina: 80,
          riskLevel: 'medio',
          notes: 'Conexión entre defensa y mediapunta. Apoyo en repliegues tácticos centralizados.'
        },
        {
          id: 'fra-rw',
          name: 'Ousmane Dembélé',
          displayName: 'Dembélé',
          number: 11,
          team: 'FRA',
          position: 'FW',
          positionLabel: 'Extremo Derecho',
          tacticalRole: 'Extremo Regateador en Aislamiento',
          x: 4,
          z: 13,
          influenceScore: 75,
          stamina: 74,
          riskLevel: 'medio',
          notes: 'Regates individuales por banda derecha buscando línea de fondo. Poca efectividad defensiva.'
        },
        {
          id: 'fra-cam',
          name: 'Antoine Griezmann',
          displayName: 'Griezmann',
          number: 7,
          team: 'FRA',
          position: 'MF',
          positionLabel: 'Mediapunta',
          tacticalRole: 'Enganche de Conexión Creativa',
          x: 7,
          z: 0,
          influenceScore: 88,
          stamina: 86,
          riskLevel: 'bajo',
          notes: 'Presión defensiva y conector en transiciones rápidas de ataque francés.'
        },
        {
          id: 'fra-lw',
          name: 'Kylian Mbappé',
          displayName: 'Mbappé',
          number: 10,
          team: 'FRA',
          position: 'FW',
          positionLabel: 'Extremo Izquierdo',
          tacticalRole: 'Delantero Interior de Explosividad',
          x: 2,
          z: -12,
          influenceScore: 94,
          stamina: 88,
          riskLevel: 'bajo',
          notes: 'Ataca la espalda de Molina. Búsqueda directa del área y desequilibrio individual explosivo.'
        },
        {
          id: 'fra-st',
          name: 'Olivier Giroud',
          displayName: 'Giroud',
          number: 9,
          team: 'FRA',
          position: 'FW',
          positionLabel: 'Delantero Centro',
          tacticalRole: 'Pivote Ofensivo del Área',
          x: 3,
          z: 0,
          influenceScore: 77,
          stamina: 68,
          riskLevel: 'bajo',
          notes: 'Fijación de centrales rivales Romero y Otamendi. Genera espacios y apoyos aéreos de espaldas.'
        }
      ]
    }
  }
};

export const getTacticalZoneType = (player: Player): string => {
  if (player.id === 'arg-ss') return 'Zona de Influencia entre Líneas';
  if (player.id === 'fra-lw') return 'Zona de Amenaza al Espacio';
  if (player.id === 'fra-dm-r') return 'Zona de Cobertura Defensiva Central';
  if (player.position === 'GK') return 'Área de Cobertura y Cierre';
  if (player.position === 'DF') {
    if (player.id === 'arg-rb' || player.id === 'fra-lb' || player.id === 'fra-rb' || player.id === 'arg-lb') {
      return 'Carril de Progresión Lateral';
    }
    return 'Zona de Cobertura y Anticipación';
  }
  if (player.position === 'MF') {
    if (player.id === 'arg-dm') return 'Zona de Distribución e Influencia (Zona 14)';
    return 'Zona de Presión y Recuperación';
  }
  if (player.position === 'FW') {
    if (player.id === 'arg-rw' || player.id === 'fra-rw') return 'Zona de Amenaza por Banda';
    return 'Zona de Fijación y Presión de Área';
  }
  return 'Zona de Influencia Táctica';
};
