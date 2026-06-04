/**
 * EXAMPLE / PLANTILLA de alineaciones oficiales — NO la importa la app.
 *
 * Muestra la forma exacta de una entrada de OFFICIAL_LINEUPS con los 11 huecos por
 * equipo (ordenados GK → DF → MF → FW) ya pre-rellenados con jugadores reales de la
 * plantilla. Úsala así el día del partido:
 *
 *   1. Genera un esqueleto para cualquier partido (lo arma desde la plantilla real):
 *        pnpm --filter @worldcup/ingestion gen:lineup M001 [formHome] [formAway]
 *   2. Copia la entrada a OFFICIAL_LINEUPS en ./officialLineups.ts
 *   3. Ajusta dorsales/nombres/manager y la formación a la alineación confirmada,
 *      y cambia status a 'confirmada'.
 *
 * El estadio usará ese XI (badge "XI Oficial"); si falta una entrada, cae al XI
 * estimado (badge "XI Estimado"). `playerId` enlaza a PLAYERS ({EQUIPO}-{n}).
 *
 * Honestidad: estas dos entradas son `status: 'probable'` (esqueleto), no
 * alineaciones oficiales reales.
 */
import type { OfficialMatchLineup } from './officialLineups';

export const EXAMPLE_OFFICIAL_LINEUPS: Record<string, OfficialMatchLineup> = {
// MEX vs RSA · 2026-06-11 13:00
  M001: {
    status: 'probable', // cambia a 'confirmada' con la alineación oficial real
    source: 'Plantilla generada — reemplazar con la fuente oficial',
    home: {
      formation: '4-3-3',
      manager: '',
      starters: [
        { shirt: 13, name: 'Guillermo Ochoa', pos: 'GK', playerId: 'MEX-7' },
        { shirt: 3, name: 'César Montes', pos: 'DF', playerId: 'MEX-6' },
        { shirt: 5, name: 'Johan Vásquez', pos: 'DF', playerId: 'MEX-8' },
        { shirt: 2, name: 'Jorge Sánchez', pos: 'DF', playerId: 'MEX-9' },
        { shirt: 17, name: 'Jesús Gallardo', pos: 'DF', playerId: 'MEX-12' },
        { shirt: 4, name: 'Edson Álvarez', pos: 'MF', playerId: 'MEX-4' },
        { shirt: 10, name: 'Orbelín Pineda', pos: 'MF', playerId: 'MEX-5' },
        { shirt: 24, name: 'Luis Chávez', pos: 'MF', playerId: 'MEX-10' },
        { shirt: 9, name: 'Santiago Giménez', pos: 'FW', playerId: 'MEX-1' },
        { shirt: 22, name: 'Hirving Lozano', pos: 'FW', playerId: 'MEX-2' },
        { shirt: 19, name: 'Raúl Jiménez', pos: 'FW', playerId: 'MEX-3' },
      ],
    },
    away: {
      formation: '4-3-3',
      manager: '',
      starters: [
        { shirt: 1, name: 'Ronwen Williams', pos: 'GK', playerId: 'RSA-3' },
        { shirt: 14, name: 'Aubrey Modiba', pos: 'DF', playerId: 'RSA-4' },
        { shirt: 2, name: 'Mothobi Mvala', pos: 'DF', playerId: 'RSA-6' },
        { shirt: 23, name: 'Khuliso Mudau', pos: 'DF', playerId: 'RSA-7' },
        { shirt: 5, name: 'Grant Kekana', pos: 'DF', playerId: 'RSA-8' },
        { shirt: 10, name: 'Themba Zwane', pos: 'MF', playerId: 'RSA-2' },
        { shirt: 4, name: 'Teboho Mokoena', pos: 'MF', playerId: 'RSA-5' },
        { shirt: 15, name: 'Sphephelo Sithole', pos: 'MF', playerId: 'RSA-9' },
        { shirt: 18, name: 'Percy Tau', pos: 'FW', playerId: 'RSA-1' },
        { shirt: 11, name: 'Elias Mokwana', pos: 'FW', playerId: 'RSA-10' },
        { shirt: 9, name: 'Evidence Makgopa', pos: 'FW', playerId: 'RSA-11' },
      ],
    },
  },
// KOR vs CZE · 2026-06-11 20:00
  M002: {
    status: 'probable', // cambia a 'confirmada' con la alineación oficial real
    source: 'Plantilla generada — reemplazar con la fuente oficial',
    home: {
      formation: '4-2-3-1',
      manager: '',
      starters: [
        { shirt: 1, name: 'Jo Hyeon-woo', pos: 'GK', playerId: 'KOR-6' },
        { shirt: 3, name: 'Kim Min-jae', pos: 'DF', playerId: 'KOR-4' },
        { shirt: 19, name: 'Kim Young-gwon', pos: 'DF', playerId: 'KOR-7' },
        { shirt: 2, name: 'Kim Moon-hwan', pos: 'DF', playerId: 'KOR-8' },
        { shirt: 23, name: 'Seol Young-woo', pos: 'DF', playerId: 'KOR-9' },
        { shirt: 18, name: 'Lee Kang-in', pos: 'MF', playerId: 'KOR-2' },
        { shirt: 17, name: 'Lee Jae-sung', pos: 'MF', playerId: 'KOR-10' },
        { shirt: 6, name: 'Hwang In-beom', pos: 'MF', playerId: 'KOR-11' },
        { shirt: 7, name: 'Son Heung-min', pos: 'MF', playerId: 'KOR-1' },
        { shirt: 11, name: 'Hwang Hee-chan', pos: 'MF', playerId: 'KOR-3' },
        { shirt: 9, name: 'Cho Gue-sung', pos: 'FW', playerId: 'KOR-5' },
      ],
    },
    away: {
      formation: '4-2-3-1',
      manager: '',
      starters: [
        { shirt: 1, name: 'Jindřich Staněk', pos: 'GK', playerId: 'CZE-4' },
        { shirt: 5, name: 'Vladimír Coufal', pos: 'DF', playerId: 'CZE-3' },
        { shirt: 22, name: 'Tomáš Holeš', pos: 'DF', playerId: 'CZE-5' },
        { shirt: 4, name: 'David Zima', pos: 'DF', playerId: 'CZE-6' },
        { shirt: 3, name: 'Robin Hranáč', pos: 'DF', playerId: 'CZE-7' },
        { shirt: 15, name: 'Tomáš Souček', pos: 'MF', playerId: 'CZE-2' },
        { shirt: 19, name: 'Lukáš Provod', pos: 'MF', playerId: 'CZE-8' },
        { shirt: 20, name: 'Pavel Šulc', pos: 'MF', playerId: 'CZE-9' },
        { shirt: 10, name: 'Patrik Schick', pos: 'MF', playerId: 'CZE-1' },
        { shirt: 14, name: 'Adam Hložek', pos: 'MF', playerId: 'CZE-10' },
        { shirt: 9, name: 'Mojmír Chytil', pos: 'FW', playerId: 'CZE-11' },
      ],
    },
  },
};
