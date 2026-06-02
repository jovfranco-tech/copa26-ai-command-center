import { playerRatings, type PlayerRatings } from '@/lib/ratings';
import type { Player as DbPlayer } from '@worldcup/shared';
import { MATCH_LINEUPS, type Player as StadiumPlayer, type TeamLineup } from './lineups';

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
 * Map real database players to the expected 3D lineup templates.
 */
export function mapDatabasePlayersToLineups(dbPlayers: DbPlayer[]): typeof MATCH_LINEUPS {
  // If no database players are loaded, return the mock lineups directly
  if (!dbPlayers || dbPlayers.length === 0) {
    return MATCH_LINEUPS;
  }

  const mapTeam = (teamCode: 'ARG' | 'FRA', slots: SlotDefinition[], fallbackLineup: TeamLineup): TeamLineup => {
    // Filter players for this team
    const teamDbPlayers = dbPlayers.filter((p) => p.team === teamCode);
    
    // Fallback if no players for this team are in database
    if (teamDbPlayers.length === 0) {
      return fallbackLineup;
    }

    const matchedPlayers: StadiumPlayer[] = [];
    const usedDbPlayerIds = new Set<string>();

    // Step 1: Exact or loose name matching for the 11 slots
    for (const slot of slots) {
      const slotNameNorm = normalizeName(slot.defaultName);
      const matchedDb = teamDbPlayers.find((p) => {
        if (usedDbPlayerIds.has(p.id)) return false;
        // Simple name checks
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
          number: matchedDb.number ?? (slot.defaultName === 'Lionel Messi' ? 10 : matchedDb.number ?? 1),
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
        };
        matchedPlayers.push(stPlayer);
      }
    }

    // Step 2: Fill remaining empty slots with the best database players of the same position
    const remainingSlots = slots.filter((slot) => !matchedPlayers.some((mp) => mp.x === slot.x && mp.z === slot.z));
    
    for (const slot of remainingSlots) {
      // Find unused database players of the same position, sorted by rating
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
        };
        matchedPlayers.push(stPlayer);
      } else {
        // Step 3: Ultimate fallback to original mock player if database runs out of that position
        const mockFallback = fallbackLineup.players.find((mp) => mp.id === slot.slotId) || fallbackLineup.players[0]!;
        matchedPlayers.push({
          ...mockFallback,
          team: teamCode
        });
      }
    }

    // Sort to maintain index consistency if needed
    matchedPlayers.sort((a, b) => a.id.localeCompare(b.id));

    return {
      ...fallbackLineup,
      players: matchedPlayers,
    };
  };

  return {
    matchId: 'match-1',
    minute: 82,
    status: 'live',
    teams: {
      home: mapTeam('ARG', ARG_SLOTS, MATCH_LINEUPS.teams.home),
      away: mapTeam('FRA', FRA_SLOTS, MATCH_LINEUPS.teams.away),
    },
  };
}
