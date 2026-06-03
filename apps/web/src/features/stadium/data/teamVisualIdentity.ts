export interface TeamVisualIdentity {
  teamCode: string;
  teamName: string;
  primaryColor: string;     // Color principal (verde, celeste, azul, etc.)
  secondaryColor: string;   // Color secundario (blanco, negro, etc.)
  accentColor: string;      // Color de acento (rojo, amarillo, etc.)
  textContrastColor: string;// Color de contraste para textos legibles
  borderColor: string;      // Color de borde suave
  jerseyColor: string;      // Color del uniforme
}

/**
 * Returns a CSS rgba string with low opacity for border use.
 * @param hex - hex color string (#rrggbb)
 * @param alpha - opacity 0–1
 */
function hexBorder(hex: string, alpha = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Returns '#ffffff' or '#000000' based on WCAG relative luminance of a hex color.
 */
function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? '#0f172a' : '#ffffff';
}

function identity(
  teamCode: string,
  teamName: string,
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
): TeamVisualIdentity {
  return {
    teamCode,
    teamName,
    primaryColor,
    secondaryColor,
    accentColor,
    textContrastColor: contrastColor(primaryColor),
    borderColor: hexBorder(primaryColor, 0.28),
    jerseyColor: primaryColor,
  };
}

/**
 * Visual identities for all 48 WC 2026 qualified teams.
 * Colors sourced from packages/shared/src/data/worldcup2026.json (colorA = primary, colorB = secondary).
 * Uso personal/privado — sin afiliación FIFA.
 */
export const TEAM_VISUAL_IDENTITIES: Record<string, TeamVisualIdentity> = {
  // ── Grupo A ──
  MEX: identity('MEX', 'México',           '#006341', '#ffffff', '#ce1126'),
  RSA: identity('RSA', 'Sudáfrica',        '#ffb612', '#007a4d', '#007a4d'),
  KOR: identity('KOR', 'Corea del Sur',    '#c8102e', '#0a2a6b', '#0a2a6b'),
  CZE: identity('CZE', 'Chequia',          '#11457e', '#d7141a', '#d7141a'),

  // ── Grupo B ──
  CAN: identity('CAN', 'Canadá',           '#d52b1e', '#ffffff', '#000000'),
  BIH: identity('BIH', 'Bosnia y Herzegovina', '#002395', '#fecb00', '#fecb00'),
  QAT: identity('QAT', 'Catar',            '#7a1336', '#ffffff', '#8d8d00'),
  SUI: identity('SUI', 'Suiza',            '#d52b1e', '#ffffff', '#000000'),

  // ── Grupo C ──
  BRA: identity('BRA', 'Brasil',           '#fed103', '#009c3a', '#002776'),
  MAR: identity('MAR', 'Marruecos',        '#c1272d', '#006233', '#006233'),
  HAI: identity('HAI', 'Haití',            '#00209f', '#d21034', '#000000'),
  SCO: identity('SCO', 'Escocia',          '#0065bf', '#ffffff', '#005eb8'),

  // ── Grupo D ──
  USA: identity('USA', 'Estados Unidos',   '#1b3c8f', '#c8102e', '#c8102e'),
  PAR: identity('PAR', 'Paraguay',         '#d52b1e', '#0038a8', '#ffffff'),
  AUS: identity('AUS', 'Australia',        '#f4c430', '#1c6b3c', '#1c6b3c'),
  TUR: identity('TUR', 'Turquía',          '#c8102e', '#ffffff', '#000000'),

  // ── Grupo E ──
  GER: identity('GER', 'Alemania',         '#ffffff', '#000000', '#d00000'),
  CUW: identity('CUW', 'Curazao',          '#002b7f', '#f9d616', '#f9d616'),
  CIV: identity('CIV', 'Costa de Marfil',  '#ec5a13', '#1c8a4d', '#f7d22c'),
  ECU: identity('ECU', 'Ecuador',          '#f4c430', '#003087', '#003087'),

  // ── Grupo F ──
  NED: identity('NED', 'Países Bajos',     '#ff4f00', '#ffffff', '#21468b'),
  JPN: identity('JPN', 'Japón',            '#0a2a6b', '#e23636', '#bc002d'),
  SWE: identity('SWE', 'Suecia',           '#005baf', '#f4c430', '#f4c430'),
  TUN: identity('TUN', 'Túnez',            '#c8102e', '#ffffff', '#000000'),

  // ── Grupo G ──
  BEL: identity('BEL', 'Bélgica',          '#e30613', '#f4c430', '#000000'),
  EGY: identity('EGY', 'Egipto',           '#c8102e', '#222222', '#ffffff'),
  IRN: identity('IRN', 'Irán',             '#1c8a4d', '#c8102e', '#ffffff'),
  NZL: identity('NZL', 'Nueva Zelanda',    '#1b3c8f', '#ffffff', '#000000'),

  // ── Grupo H ──
  ESP: identity('ESP', 'España',           '#c60b1e', '#ffc600', '#002776'),
  CPV: identity('CPV', 'Cabo Verde',       '#003893', '#cf2027', '#f7d22c'),
  KSA: identity('KSA', 'Arabia Saudita',   '#1c6b3c', '#ffffff', '#ffffff'),
  URU: identity('URU', 'Uruguay',          '#56a0d3', '#0a1a2f', '#ffffff'),

  // ── Grupo I ──
  FRA: identity('FRA', 'Francia',          '#071f4e', '#ffffff', '#e1001a'),
  SEN: identity('SEN', 'Senegal',          '#1c8a4d', '#f4c430', '#cf0921'),
  IRQ: identity('IRQ', 'Irak',             '#007a3d', '#ce1126', '#000000'),
  NOR: identity('NOR', 'Noruega',          '#c60c30', '#0a2a6b', '#0a2a6b'),

  // ── Grupo J ──
  ARG: identity('ARG', 'Argentina',        '#74acdf', '#ffffff', '#f6b40e'),
  ALG: identity('ALG', 'Argelia',          '#1c8a4d', '#ffffff', '#d21034'),
  AUT: identity('AUT', 'Austria',          '#cf142b', '#ffffff', '#000000'),
  JOR: identity('JOR', 'Jordania',         '#007a3d', '#ce1126', '#000000'),

  // ── Grupo K ──
  POR: identity('POR', 'Portugal',         '#006847', '#c8102e', '#f7d22c'),
  COD: identity('COD', 'RD Congo',         '#007fff', '#f7d518', '#ce1126'),
  UZB: identity('UZB', 'Uzbekistán',       '#1eb53a', '#0099b5', '#ffffff'),
  COL: identity('COL', 'Colombia',         '#f4c430', '#003087', '#c8102e'),

  // ── Grupo L ──
  ENG: identity('ENG', 'Inglaterra',       '#dfe3ea', '#cf142b', '#cf142b'),
  CRO: identity('CRO', 'Croacia',          '#c8102e', '#1b3c8f', '#1b3c8f'),
  GHA: identity('GHA', 'Ghana',            '#c8102e', '#f4c430', '#006b3f'),
  PAN: identity('PAN', 'Panamá',           '#005293', '#c8102e', '#c8102e'),
};

export function getTeamVisualIdentity(teamCode: string, isHome: boolean = true): TeamVisualIdentity {
  const code = teamCode.toUpperCase();
  if (TEAM_VISUAL_IDENTITIES[code]) {
    return TEAM_VISUAL_IDENTITIES[code];
  }
  // Fallback dinámico genérico — no debería ocurrir con los 48 equipos registrados
  const fallbackColor = isHome ? '#3b82f6' : '#ef4444';
  return {
    teamCode: code,
    teamName: teamCode,
    primaryColor: fallbackColor,
    secondaryColor: '#ffffff',
    accentColor: isHome ? '#2563eb' : '#dc2626',
    textContrastColor: '#ffffff',
    borderColor: isHome ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)',
    jerseyColor: fallbackColor,
  };
}
