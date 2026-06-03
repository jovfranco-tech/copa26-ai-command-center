import { playerRatings, type PlayerRatings } from '@/lib/ratings';
import type { Player as DbPlayer } from '@worldcup/shared';
import { type Player as StadiumPlayer, type TeamLineup, type MatchLineups } from './lineups';
import { getTeamVisualIdentity } from './teamVisualIdentity';
import { MATCH_FIXTURES } from './matchData';

interface SlotDefinition {
  slotId: string;
  pos: 'GK' | 'DF' | 'MF' | 'FW';
  x: number;
  z: number;
  defaultRole: string;
  defaultLabel: string;
  defaultName: string;
}

const ARG_SLOTS: SlotDefinition[] = [
  { slotId: 'arg-gk', pos: 'GK', x: -28, z: 0, defaultRole: 'Portero de Línea y Cierre', defaultLabel: 'Portero', defaultName: 'Emiliano Martínez' },
  { slotId: 'arg-rb', pos: 'DF', x: -15, z: -13, defaultRole: 'Carrilero de Proyección', defaultLabel: 'Lateral Derecho', defaultName: 'Nahuel Molina' },
  { slotId: 'arg-cb-r', pos: 'DF', x: -20, z: -6, defaultRole: 'Defensa Tapón Agresivo', defaultLabel: 'Defensa Central', defaultName: 'Cristian Romero' },
  { slotId: 'arg-cb-l', pos: 'DF', x: -20, z: 6, defaultRole: 'Defensa de Cobertura', defaultLabel: 'Defensa Central', defaultName: 'Nicolás Otamendi' },
  { slotId: 'arg-lb', pos: 'DF', x: -15, z: 13, defaultRole: 'Lateral Defensivo Invertido', defaultLabel: 'Lateral Izquierdo', defaultName: 'Nicolás Tagliafico' },
  { slotId: 'arg-cm-r', pos: 'MF', x: -7, z: -6, defaultRole: 'Interior Box-to-Box', defaultLabel: 'Mediocampista', defaultName: 'Rodrigo De Paul' },
  { slotId: 'arg-dm', pos: 'MF', x: -11, z: 0, defaultRole: 'Pivote Organizador', defaultLabel: 'Mediocentro', defaultName: 'Enzo Fernández' },
  { slotId: 'arg-cm-l', pos: 'MF', x: -7, z: 6, defaultRole: 'Interior Creativo / Enlace', defaultLabel: 'Mediocampista', defaultName: 'Alexis Mac Allister' },
  { slotId: 'arg-rw', pos: 'FW', x: -4, z: -16, defaultRole: 'Extremo Puro de Amplitud', defaultLabel: 'Extremo Derecho', defaultName: 'Ángel Di María' },
  { slotId: 'arg-st', pos: 'FW', x: -4, z: -2, defaultRole: 'Presionador de Salida', defaultLabel: 'Delantero Centro', defaultName: 'Julián Álvarez' },
  { slotId: 'arg-ss', pos: 'FW', x: -2, z: 9, defaultRole: 'Organizador Libre Dinámico', defaultLabel: 'Mediapunta / Creador', defaultName: 'Lionel Messi' },
];

const FRA_SLOTS: SlotDefinition[] = [
  { slotId: 'fra-gk', pos: 'GK', x: 28, z: 0, defaultRole: 'Portero Líbano de Distribución', defaultLabel: 'Portero', defaultName: 'Mike Maignan' },
  { slotId: 'fra-rb', pos: 'DF', x: 16, z: 13, defaultRole: 'Lateral de Cierre Tercer Central', defaultLabel: 'Lateral Derecho', defaultName: 'Jules Koundé' },
  { slotId: 'fra-cb-r', pos: 'DF', x: 21, z: 6, defaultRole: 'Defensa Marcador de Choque', defaultLabel: 'Defensa Central', defaultName: 'Dayot Upamecano' },
  { slotId: 'fra-cb-l', pos: 'DF', x: 21, z: -6, defaultRole: 'Defensa Escudo de Anticipación', defaultLabel: 'Defensa Central', defaultName: 'William Saliba' },
  { slotId: 'fra-lb', pos: 'DF', x: 14, z: -13, defaultRole: 'Carrilero Ofensivo de Transición', defaultLabel: 'Lateral Izquierdo', defaultName: 'Theo Hernández' },
  { slotId: 'fra-dm-r', pos: 'MF', x: 11, z: -4, defaultRole: 'Pivote Ancla Destructor', defaultLabel: 'Mediocentro Defensivo', defaultName: 'Aurélien Tchouaméni' },
  { slotId: 'fra-dm-l', pos: 'MF', x: 11, z: 4, defaultRole: 'Pivote Mixto de Salida', defaultLabel: 'Mediocentro', defaultName: 'Adrien Rabiot' },
  { slotId: 'fra-rw', pos: 'FW', x: 4, z: 13, defaultRole: 'Extremo Regateador en Aislamiento', defaultLabel: 'Extremo Derecho', defaultName: 'Ousmane Dembélé' },
  { slotId: 'fra-cam', pos: 'MF', x: 7, z: 0, defaultRole: 'Enganche de Conexión Creativa', defaultLabel: 'Mediapunta', defaultName: 'Antoine Griezmann' },
  { slotId: 'fra-lw', pos: 'FW', x: 2, z: -12, defaultRole: 'Delantero Interior de Explosividad', defaultLabel: 'Extremo Izquierdo', defaultName: 'Kylian Mbappé' },
  { slotId: 'fra-st', pos: 'FW', x: 3, z: 0, defaultRole: 'Pivote Ofensivo del Área', defaultLabel: 'Delantero Centro', defaultName: 'Olivier Giroud' },
];

const BRA_SLOTS: SlotDefinition[] = [
  { slotId: 'bra-gk', pos: 'GK', x: -28, z: 0, defaultRole: 'Portero de Cierre Línea', defaultLabel: 'Portero', defaultName: 'Alisson' },
  { slotId: 'bra-rb', pos: 'DF', x: -15, z: -13, defaultRole: 'Lateral de Proyección', defaultLabel: 'Lateral Derecho', defaultName: 'Danilo' },
  { slotId: 'bra-cb-r', pos: 'DF', x: -20, z: -6, defaultRole: 'Defensa Marcador Físico', defaultLabel: 'Defensa Central', defaultName: 'Éder Militão' },
  { slotId: 'bra-cb-l', pos: 'DF', x: -20, z: 6, defaultRole: 'Defensa de Anticipación', defaultLabel: 'Defensa Central', defaultName: 'Marquinhos' },
  { slotId: 'bra-lb', pos: 'DF', x: -15, z: 13, defaultRole: 'Lateral de Cierre Banda', defaultLabel: 'Lateral Izquierdo', defaultName: 'Gabriel Magalhães' },
  { slotId: 'bra-dm', pos: 'MF', x: -10, z: -5, defaultRole: 'Pivote Destructor', defaultLabel: 'Mediocentro Defensivo', defaultName: 'Casemiro' },
  { slotId: 'bra-cm', pos: 'MF', x: -10, z: 5, defaultRole: 'Pivote Organizador de Salida', defaultLabel: 'Mediocampista', defaultName: 'Bruno Guimarães' },
  { slotId: 'bra-rw', pos: 'FW', x: -4, z: -15, defaultRole: 'Extremo de Amplitud', defaultLabel: 'Extremo Derecho', defaultName: 'Raphinha' },
  { slotId: 'bra-st-r', pos: 'FW', x: -3, z: -4, defaultRole: 'Segundo Delantero de Conexión', defaultLabel: 'Segundo Delantero', defaultName: 'Rodrygo' },
  { slotId: 'bra-st-l', pos: 'FW', x: -3, z: 4, defaultRole: 'Delantero de Área Objetivo', defaultLabel: 'Delantero Centro', defaultName: 'Lucas Paquetá' },
  { slotId: 'bra-lw', pos: 'FW', x: -4, z: 15, defaultRole: 'Delantero Interior Explosivo', defaultLabel: 'Extremo Izquierdo', defaultName: 'Vinícius Júnior' },
];

const GER_SLOTS: SlotDefinition[] = [
  { slotId: 'ger-gk', pos: 'GK', x: 28, z: 0, defaultRole: 'Portero Líbano de Distribución', defaultLabel: 'Portero', defaultName: 'Marc-André ter Stegen' },
  { slotId: 'ger-rcb', pos: 'DF', x: 21, z: 6, defaultRole: 'Defensa de Cobertura Lateral', defaultLabel: 'Defensa Central', defaultName: 'Jonathan Tah' },
  { slotId: 'ger-cb', pos: 'DF', x: 22, z: 0, defaultRole: 'Defensa Libero y Cierre', defaultLabel: 'Defensa Central', defaultName: 'Antonio Rüdiger' },
  { slotId: 'ger-lcb', pos: 'DF', x: 21, z: -6, defaultRole: 'Defensa Escudo Anticipación', defaultLabel: 'Defensa Central', defaultName: 'Nico Schlotterbeck' },
  { slotId: 'ger-rwb', pos: 'DF', x: 14, z: 14, defaultRole: 'Carrilero de Progresión Total', defaultLabel: 'Carrilero Derecho', defaultName: 'Joshua Kimmich' },
  { slotId: 'ger-lwb', pos: 'DF', x: 14, z: -14, defaultRole: 'Carrilero de Transición Veloz', defaultLabel: 'Carrilero Izquierdo', defaultName: 'David Raum' },
  { slotId: 'ger-dm', pos: 'MF', x: 11, z: 0, defaultRole: 'Pivote Ancla Defensivo', defaultLabel: 'Mediocentro Defensivo', defaultName: 'İlkay Gündoğan' },
  { slotId: 'ger-am-r', pos: 'MF', x: 7, z: 5, defaultRole: 'Interior Creativo Enlace', defaultLabel: 'Mediapunta', defaultName: 'Florian Wirtz' },
  { slotId: 'ger-am-l', pos: 'MF', x: 7, z: -5, defaultRole: 'Organizador Libre de Ataque', defaultLabel: 'Mediapunta', defaultName: 'Jamal Musiala' },
  { slotId: 'ger-st-r', pos: 'FW', x: 3, z: 4, defaultRole: 'Delantero Móvil Asociativo', defaultLabel: 'Delantero Centro', defaultName: 'Kai Havertz' },
  { slotId: 'ger-st-l', pos: 'FW', x: 3, z: -4, defaultRole: 'Presionador y Definidor', defaultLabel: 'Delantero Centro', defaultName: 'Leroy Sané' },
];

const ESP_SLOTS: SlotDefinition[] = [
  { slotId: 'esp-gk', pos: 'GK', x: -28, z: 0, defaultRole: 'Portero de Cobertura y Salida', defaultLabel: 'Portero', defaultName: 'Unai Simón' },
  { slotId: 'esp-rb', pos: 'DF', x: -15, z: -13, defaultRole: 'Lateral de Proyección Táctica', defaultLabel: 'Lateral Derecho', defaultName: 'Dani Carvajal' },
  { slotId: 'esp-cb-r', pos: 'DF', x: -20, z: -6, defaultRole: 'Defensa Escudo y Anticipo', defaultLabel: 'Defensa Central', defaultName: 'Robin Le Normand' },
  { slotId: 'esp-cb-l', pos: 'DF', x: -20, z: 6, defaultRole: 'Defensa Marcador de Salida', defaultLabel: 'Defensa Central', defaultName: 'Aymeric Laporte' },
  { slotId: 'esp-lb', pos: 'DF', x: -15, z: 13, defaultRole: 'Carrilero Ofensivo Rápido', defaultLabel: 'Lateral Izquierdo', defaultName: 'Marc Cucurella' },
  { slotId: 'esp-dm', pos: 'MF', x: -11, z: 0, defaultRole: 'Pivote Organizador y Recuperador', defaultLabel: 'Mediocentro Defensivo', defaultName: 'Rodri' },
  { slotId: 'esp-cm-r', pos: 'MF', x: -7, z: -6, defaultRole: 'Interior Organizador Posicional', defaultLabel: 'Mediocampista', defaultName: 'Pedri' },
  { slotId: 'esp-cm-l', pos: 'MF', x: -7, z: 6, defaultRole: 'Interior Box-to-Box Dinámico', defaultLabel: 'Mediocampista', defaultName: 'Gavi' },
  { slotId: 'esp-rw', pos: 'FW', x: -4, z: -16, defaultRole: 'Extremo Regateador Creativo', defaultLabel: 'Extremo Derecho', defaultName: 'Lamine Yamal' },
  { slotId: 'esp-st', pos: 'FW', x: -4, z: -2, defaultRole: 'Delantero Centro de Enlace', defaultLabel: 'Delantero Centro', defaultName: 'Fabián Ruiz' },
  { slotId: 'esp-lw', pos: 'FW', x: -4, z: 15, defaultRole: 'Extremo de Desborde y Velocidad', defaultLabel: 'Extremo Izquierdo', defaultName: 'Nico Williams' },
];

const NED_SLOTS: SlotDefinition[] = [
  { slotId: 'ned-gk', pos: 'GK', x: 28, z: 0, defaultRole: 'Portero de Salida Rápida', defaultLabel: 'Portero', defaultName: 'Bart Verbruggen' },
  { slotId: 'ned-rwb', pos: 'DF', x: 15, z: 14, defaultRole: 'Carrilero de Proyección Total', defaultLabel: 'Carrilero Derecho', defaultName: 'Denzel Dumfries' },
  { slotId: 'ned-rcb', pos: 'DF', x: 21, z: 7, defaultRole: 'Defensa Escudo Anticipación', defaultLabel: 'Defensa Central', defaultName: 'Stefan de Vrij' },
  { slotId: 'ned-cb', pos: 'DF', x: 22, z: 0, defaultRole: 'Defensa de Cobertura y Cierre', defaultLabel: 'Defensa Central', defaultName: 'Virgil van Dijk' },
  { slotId: 'ned-lcb', pos: 'DF', x: 21, z: -7, defaultRole: 'Defensa de Cierre Físico', defaultLabel: 'Defensa Central', defaultName: 'Nathan Aké' },
  { slotId: 'ned-lwb', pos: 'DF', x: 15, z: -14, defaultRole: 'Carrilero Ofensivo Técnico', defaultLabel: 'Carrilero Izquierdo', defaultName: 'Jeremie Frimpong' },
  { slotId: 'ned-dm', pos: 'MF', x: 11, z: 0, defaultRole: 'Pivote Organizador Técnico', defaultLabel: 'Mediocentro Defensivo', defaultName: 'Frenkie de Jong' },
  { slotId: 'ned-cm-r', pos: 'MF', x: 7, z: -5, defaultRole: 'Interior Box-to-Box Mixto', defaultLabel: 'Mediocampista', defaultName: 'Tijjani Reijnders' },
  { slotId: 'ned-cm-l', pos: 'MF', x: 7, z: 5, defaultRole: 'Mediapunta Creativo Dinámico', defaultLabel: 'Mediocampista', defaultName: 'Xavi Simons' },
  { slotId: 'ned-st-r', pos: 'FW', x: 3, z: 4, defaultRole: 'Segundo Delantero de Movilidad', defaultLabel: 'Delantero Centro', defaultName: 'Cody Gakpo' },
  { slotId: 'ned-st-l', pos: 'FW', x: 3, z: -4, defaultRole: 'Delantero de Área Definidor', defaultLabel: 'Delantero Centro', defaultName: 'Memphis Depay' },
];

const MEX_SLOTS: SlotDefinition[] = [
  { slotId: 'mex-gk', pos: 'GK', x: -28, z: 0, defaultRole: 'Portero de Línea y Cierre', defaultLabel: 'Portero', defaultName: 'Guillermo Ochoa' },
  { slotId: 'mex-rb', pos: 'DF', x: -15, z: -13, defaultRole: 'Lateral de Proyección', defaultLabel: 'Lateral Derecho', defaultName: 'Jorge Sánchez' },
  { slotId: 'mex-cb-r', pos: 'DF', x: -20, z: -6, defaultRole: 'Defensa Central de Choque', defaultLabel: 'Defensa Central', defaultName: 'César Montes' },
  { slotId: 'mex-cb-l', pos: 'DF', x: -20, z: 6, defaultRole: 'Defensa de Salida y Cobertura', defaultLabel: 'Defensa Central', defaultName: 'Johan Vásquez' },
  { slotId: 'mex-lb', pos: 'DF', x: -15, z: 13, defaultRole: 'Lateral de Apoyo Defensivo', defaultLabel: 'Lateral Izquierdo', defaultName: 'Jesús Gallardo' },
  { slotId: 'mex-cm-r', pos: 'MF', x: -7, z: -6, defaultRole: 'Interior de Enlace y Presión', defaultLabel: 'Mediocampista', defaultName: 'Luis Romo' },
  { slotId: 'mex-dm', pos: 'MF', x: -11, z: 0, defaultRole: 'Pivote de Contención y Salida', defaultLabel: 'Mediocentro Defensivo', defaultName: 'Edson Álvarez' },
  { slotId: 'mex-cm-l', pos: 'MF', x: -7, z: 6, defaultRole: 'Interior Box-to-Box Pasador', defaultLabel: 'Mediocampista', defaultName: 'Luis Chávez' },
  { slotId: 'mex-rw', pos: 'FW', x: -4, z: -16, defaultRole: 'Extremo de Velocidad y Desborde', defaultLabel: 'Extremo Derecho', defaultName: 'Orbelín Pineda' },
  { slotId: 'mex-st', pos: 'FW', x: -4, z: -2, defaultRole: 'Delantero Centro de Presión', defaultLabel: 'Delantero Centro', defaultName: 'Santiago Giménez' },
  { slotId: 'mex-lw', pos: 'FW', x: -4, z: 16, defaultRole: 'Delantero Interior Rápido', defaultLabel: 'Extremo Izquierdo', defaultName: 'Hirving Lozano' },
];

const RSA_SLOTS: SlotDefinition[] = [
  { slotId: 'rsa-gk', pos: 'GK', x: 28, z: 0, defaultRole: 'Portero Cierre de Área', defaultLabel: 'Portero', defaultName: 'Ronwen Williams' },
  { slotId: 'rsa-rb', pos: 'DF', x: 15, z: 13, defaultRole: 'Lateral de Proyección Veloz', defaultLabel: 'Lateral Derecho', defaultName: 'Khuliso Mudau' },
  { slotId: 'rsa-cb-r', pos: 'DF', x: 20, z: 6, defaultRole: 'Defensa Central de Choque', defaultLabel: 'Defensa Central', defaultName: 'Grant Kekana' },
  { slotId: 'rsa-cb-l', pos: 'DF', x: 20, z: -6, defaultRole: 'Defensa de Cobertura Física', defaultLabel: 'Defensa Central', defaultName: 'Mothobi Mvala' },
  { slotId: 'rsa-lb', pos: 'DF', x: 15, z: -13, defaultRole: 'Lateral Defensivo de Apoyo', defaultLabel: 'Lateral Izquierdo', defaultName: 'Aubrey Modiba' },
  { slotId: 'rsa-dm', pos: 'MF', x: 11, z: 0, defaultRole: 'Pivote Organizador y Recuperador', defaultLabel: 'Mediocentro Defensivo', defaultName: 'Teboho Mokoena' },
  { slotId: 'rsa-cm-r', pos: 'MF', x: 7, z: 6, defaultRole: 'Mediocentro Creador Dinámico', defaultLabel: 'Mediocampista', defaultName: 'Themba Zwane' },
  { slotId: 'rsa-cm-l', pos: 'MF', x: 7, z: -5, defaultRole: 'Interior Mixto de Salida', defaultLabel: 'Mediocampista', defaultName: 'Sphephelo Sithole' },
  { slotId: 'rsa-rw', pos: 'FW', x: 4, z: 16, defaultRole: 'Extremo Rápido de Desborde', defaultLabel: 'Extremo Derecho', defaultName: 'Elias Mokwana' },
  { slotId: 'rsa-st', pos: 'FW', x: 4, z: 2, defaultRole: 'Delantero Centro de Presión', defaultLabel: 'Delantero Centro', defaultName: 'Evidence Makgopa' },
  { slotId: 'rsa-lw', pos: 'FW', x: 4, z: -16, defaultRole: 'Delantero Interior de Velocidad', defaultLabel: 'Extremo Izquierdo', defaultName: 'Percy Tau' },
];

const SLOT_TEMPLATES: Record<string, SlotDefinition[]> = {
  MEX: MEX_SLOTS,
  RSA: RSA_SLOTS,
  ARG: ARG_SLOTS,
  FRA: FRA_SLOTS,
  BRA: BRA_SLOTS,
  GER: GER_SLOTS,
  ESP: ESP_SLOTS,
  NED: NED_SLOTS,
};

interface TeamInfo {
  name: string;
  color: string;
  standsColor: string;
  formation: string;
  manager: string;
}

const TEAM_INFO: Record<string, TeamInfo> = {
  MEX: { name: 'México', color: '#006341', standsColor: '#006341', formation: '4-3-3', manager: 'Javier Aguirre' },
  RSA: { name: 'Sudáfrica', color: '#007a4d', standsColor: '#ffb612', formation: '4-3-3', manager: 'Hugo Broos' },
  ARG: { name: 'Argentina', color: '#74acdf', standsColor: '#74acdf', formation: '4-3-3', manager: 'Lionel Scaloni' },
  FRA: { name: 'Francia', color: '#0f2042', standsColor: '#0f2042', formation: '4-2-3-1', manager: 'Didier Deschamps' },
  BRA: { name: 'Brasil', color: '#fed103', standsColor: '#009b3a', formation: '4-2-4', manager: 'Dorival Júnior' },
  GER: { name: 'Alemania', color: '#ffffff', standsColor: '#d2143a', formation: '3-5-2', manager: 'Julian Nagelsmann' },
  ESP: { name: 'España', color: '#c60b1e', standsColor: '#fed103', formation: '4-3-3', manager: 'Luis de la Fuente' },
  NED: { name: 'Países Bajos', color: '#ff4f00', standsColor: '#ffffff', formation: '5-3-2', manager: 'Ronald Koeman' },
};

/**
 * Deterministic generator for AI tactical insights based on real database stats.
 */
export function generateDeterministicInsight(p: StadiumPlayer, ratings: PlayerRatings): string {
  const name = p.displayName;
  let text = '';

  if (p.position === 'GK') {
    text = `Seguridad bajo presión: ${name} (Rating ${ratings.overall}) se destaca por su ${ratings.dribbling >= 78 ? 'alto nivel de reflejos y rapidez mental' : 'solidez posicional'}. `;
    text += `Su capacidad física (${ratings.physical}) le permite controlar el área en balones aéreos y juego aéreo.`;
  } else if (p.position === 'DF') {
    text = `Cobertura táctica: ${name} aprovecha su capacidad defensiva de ${ratings.defending} y físico de ${ratings.physical} para dominar los duelos terrestres. `;
    if (ratings.pace >= 74) {
      text += `Su alta velocidad (${ratings.pace}) le facilita realizar transiciones de repliegue y coberturas de banda eficientes.`;
    } else {
      text += `Mantiene una sólida vigilancia posicional en bloque bajo para compensar su velocidad.`;
    }
  } else if (p.position === 'MF') {
    if (ratings.passing >= 80 && ratings.dribbling >= 80) {
      text = `Creador entre líneas: ${name} es el motor creativo con PAS ${ratings.passing} y REG ${ratings.dribbling}. Explota los espacios interiores en tres cuartos de campo, distribuyendo balones con alta precisión.`;
    } else if (ratings.defending >= 72) {
      text = `Pivote de equilibrio: Con DEF ${ratings.defending} y FIS ${ratings.physical}, ${name} actúa como un destructor táctico, recuperando balones y protegiendo el carril central de contraataques rivales.`;
    } else {
      text = `Mediocampista de enlace: Conecta las líneas mediante pases cortos y apoyos posicionales constantes, manteniendo un nivel de influencia de ${ratings.overall}.`;
    }
  } else { // FW
    if (ratings.pace >= 80 && ratings.shooting >= 80) {
      text = `Amenaza al espacio: ${name} combina velocidad explosiva (${ratings.pace}) y contundencia de remate (${ratings.shooting}). Ataca las espaldas de la zaga y busca desequilibrio individual en velocidad.`;
    } else if (ratings.dribbling >= 82) {
      text = `Generador en aislamiento: Con un regate de ${ratings.dribbling}, ${name} busca duelos de 1v1 en banda para ensanchar el campo y generar superioridad ofensiva.`;
    } else {
      text = `Pivote ofensivo de área: Fija centrales rivales gracias a su físico de ${ratings.physical} y finaliza jugadas colectivas con un tiro de ${ratings.shooting}.`;
    }
  }

  if (ratings.physical < 65) {
    text += ` Su bajo físico (${ratings.physical}) representa un ligero riesgo de fatiga en tramos finales de presión alta.`;
  }

  return text;
}

/**
 * Normalizes names to match database players to positions.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z]/g, ''); // keep letters only
}

/**
 * Generate slots for teams not in key templates (mirrors generic coordinate system).
 */
function generateGenericSlots(teamCode: string, side: 'home' | 'away'): SlotDefinition[] {
  const sign = side === 'home' ? -1 : 1;
  const tShort = teamCode.toLowerCase();
  return [
    { slotId: `${tShort}-gk`, pos: 'GK', x: sign * 28, z: 0, defaultRole: 'Portero de Bloque', defaultLabel: 'Portero', defaultName: 'Arquero' },
    { slotId: `${tShort}-rb`, pos: 'DF', x: sign * 15, z: sign * -13, defaultRole: 'Defensa Lateral', defaultLabel: 'Lateral Derecho', defaultName: 'Lateral' },
    { slotId: `${tShort}-cb-r`, pos: 'DF', x: sign * 20, z: sign * -6, defaultRole: 'Defensa Central', defaultLabel: 'Defensa Central', defaultName: 'Central' },
    { slotId: `${tShort}-cb-l`, pos: 'DF', x: sign * 20, z: sign * 6, defaultRole: 'Defensa Central', defaultLabel: 'Defensa Central', defaultName: 'Central' },
    { slotId: `${tShort}-lb`, pos: 'DF', x: sign * 15, z: sign * 13, defaultRole: 'Defensa Lateral', defaultLabel: 'Lateral Izquierdo', defaultName: 'Lateral' },
    { slotId: `${tShort}-cm-r`, pos: 'MF', x: sign * 7, z: sign * -6, defaultRole: 'Mediocampista Mixto', defaultLabel: 'Mediocampista', defaultName: 'Interior' },
    { slotId: `${tShort}-dm`, pos: 'MF', x: sign * 11, z: 0, defaultRole: 'Mediocentro Posicional', defaultLabel: 'Mediocentro', defaultName: 'Pivote' },
    { slotId: `${tShort}-cm-l`, pos: 'MF', x: sign * 7, z: sign * 6, defaultRole: 'Mediocampista Creador', defaultLabel: 'Mediocampista', defaultName: 'Interior' },
    { slotId: `${tShort}-rw`, pos: 'FW', x: sign * 4, z: sign * -16, defaultRole: 'Atacante de Banda', defaultLabel: 'Extremo Derecho', defaultName: 'Extremo' },
    { slotId: `${tShort}-st`, pos: 'FW', x: sign * 4, z: sign * -2, defaultRole: 'Finalizador de Área', defaultLabel: 'Delantero Centro', defaultName: 'Delantero' },
    { slotId: `${tShort}-ss`, pos: 'FW', x: sign * 2, z: sign * 9, defaultRole: 'Mediapunta de Enlace', defaultLabel: 'Mediapunta', defaultName: 'Mediapunta' },
  ];
}

/**
 * Map real database players to the expected 3D lineup templates.
 */
export function mapDatabasePlayersToLineups(
  dbPlayers: DbPlayer[],
  homeCode: string,
  awayCode: string,
  matchId: string
): MatchLineups {
  const getTeamSlots = (teamCode: string, side: 'home' | 'away'): SlotDefinition[] => {
    return SLOT_TEMPLATES[teamCode] || generateGenericSlots(teamCode, side);
  };



  const getTeamDetails = (teamCode: string, side: 'home' | 'away'): TeamInfo => {
    const info = TEAM_INFO[teamCode];
    const visual = getTeamVisualIdentity(teamCode, side === 'home');
    return {
      name: info?.name || visual.teamName,
      color: visual.primaryColor,
      standsColor: info?.standsColor || visual.secondaryColor,
      formation: info?.formation || '4-3-3',
      manager: info?.manager || 'Director Técnico',
    };
  };

  const mapTeam = (teamCode: string, slots: SlotDefinition[], side: 'home' | 'away'): TeamLineup => {
    const info = getTeamDetails(teamCode, side);
    const teamDbPlayers = dbPlayers.filter((p) => p.team === teamCode);
    const matchedPlayers: StadiumPlayer[] = [];
    const usedDbPlayerIds = new Set<string>();

    // Step 1: Exact or loose name matching for the slots
    for (const slot of slots) {
      const slotNameNorm = normalizeName(slot.defaultName);
      const matchedDb = teamDbPlayers.find((p) => {
        if (usedDbPlayerIds.has(p.id)) return false;
        const pNameNorm = normalizeName(p.name);
        return pNameNorm.includes(slotNameNorm) || slotNameNorm.includes(pNameNorm);
      });

      if (matchedDb) {
        usedDbPlayerIds.add(matchedDb.id);
        const ratings = playerRatings(matchedDb);
        const stPlayer: StadiumPlayer = {
          id: matchedDb.id,
          name: matchedDb.name,
          displayName: matchedDb.name.split(' ').pop() || matchedDb.name,
          number: matchedDb.number ?? (slot.slotId.includes('ss') && teamCode === 'ARG' ? 10 : matchedDb.number ?? 1),
          team: teamCode,
          position: matchedDb.pos,
          positionLabel: matchedDb.posLong ?? slot.defaultLabel,
          tacticalRole: slot.defaultRole,
          x: slot.x,
          z: slot.z,
          influenceScore: ratings.overall,
          stamina: ratings.physical,
          riskLevel: ratings.defending < 50 ? 'alto' : ratings.defending < 70 ? 'medio' : 'bajo',
          notes: `Jugador real del dashboard (${matchedDb.club}). Calificación de rendimiento ${ratings.overall} (${ratings.source === 'fc26' ? 'EA SPORTS FC 26' : 'Estimada'}).`,
          pos: matchedDb.pos,
          club: matchedDb.club,
          age: matchedDb.age,
          slotId: slot.slotId,
        };
        matchedPlayers.push(stPlayer);
      }
    }

    // Step 2: Fill remaining empty slots with the best database players of the same position
    const remainingSlots = slots.filter((slot) => !matchedPlayers.some((mp) => mp.slotId === slot.slotId));
    
    for (const slot of remainingSlots) {
      const candidates = teamDbPlayers
        .filter((p) => !usedDbPlayerIds.has(p.id) && p.pos === slot.pos)
        .sort((a, b) => playerRatings(b).overall - playerRatings(a).overall);

      if (candidates.length > 0) {
        const bestCandidate = candidates[0];
        usedDbPlayerIds.add(bestCandidate.id);
        const ratings = playerRatings(bestCandidate);
        const stPlayer: StadiumPlayer = {
          id: bestCandidate.id,
          name: bestCandidate.name,
          displayName: bestCandidate.name.split(' ').pop() || bestCandidate.name,
          number: bestCandidate.number ?? 1,
          team: teamCode,
          position: bestCandidate.pos,
          positionLabel: bestCandidate.posLong ?? slot.defaultLabel,
          tacticalRole: slot.defaultRole,
          x: slot.x,
          z: slot.z,
          influenceScore: ratings.overall,
          stamina: ratings.physical,
          riskLevel: ratings.defending < 50 ? 'alto' : ratings.defending < 70 ? 'medio' : 'bajo',
          notes: `Rol táctico asignado dinámicamente (${bestCandidate.club}).`,
          pos: bestCandidate.pos,
          club: bestCandidate.club,
          age: bestCandidate.age,
          slotId: slot.slotId,
        };
        matchedPlayers.push(stPlayer);
      } else {
        // Step 3: Ultimate fallback to dynamic fallback player structure
        matchedPlayers.push({
          id: slot.slotId,
          name: slot.defaultName,
          displayName: slot.defaultName.split(' ').pop() || slot.defaultName,
          number: slot.slotId.includes('st') ? 9 : slot.slotId.includes('gk') ? 1 : 4,
          team: teamCode,
          position: slot.pos,
          positionLabel: slot.defaultLabel,
          tacticalRole: slot.defaultRole,
          x: slot.x,
          z: slot.z,
          influenceScore: 75,
          stamina: 80,
          riskLevel: 'medio',
          notes: `Jugador de plantilla (${info.name}).`,
          slotId: slot.slotId,
        });
      }
    }

    matchedPlayers.sort((a, b) => a.slotId!.localeCompare(b.slotId!));

    return {
      teamCode,
      teamName: info.name,
      color: info.color,
      standsColor: info.standsColor,
      formation: info.formation,
      manager: info.manager,
      players: matchedPlayers,
    };
  };

  const homeSlots = getTeamSlots(homeCode, 'home');
  const awaySlots = getTeamSlots(awayCode, 'away');

  const fixture = MATCH_FIXTURES.find(f => f.id === matchId);
  const minuteVal = fixture?.liveTime ? parseInt(fixture.liveTime) : (fixture?.status === 'post-match' ? 90 : 0);
  const statusVal = fixture?.status || 'pre-match';

  return {
    matchId,
    minute: minuteVal,
    status: statusVal,
    teams: {
      home: mapTeam(homeCode, homeSlots, 'home'),
      away: mapTeam(awayCode, awaySlots, 'away'),
    },
  };
}
