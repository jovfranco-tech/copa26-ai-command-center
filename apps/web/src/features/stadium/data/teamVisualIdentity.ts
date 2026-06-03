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

export const TEAM_VISUAL_IDENTITIES: Record<string, TeamVisualIdentity> = {
  MEX: {
    teamCode: 'MEX',
    teamName: 'México',
    primaryColor: '#006341',
    secondaryColor: '#ffffff',
    accentColor: '#ce1126',
    textContrastColor: '#ffffff',
    borderColor: 'rgba(0, 99, 65, 0.25)',
    jerseyColor: '#006341',
  },
  RSA: {
    teamCode: 'RSA',
    teamName: 'Sudáfrica',
    primaryColor: '#ffb612',
    secondaryColor: '#007a4d',
    accentColor: '#007a4d',
    textContrastColor: '#0f2042',
    borderColor: 'rgba(255, 182, 18, 0.25)',
    jerseyColor: '#ffb612',
  },
  ARG: {
    teamCode: 'ARG',
    teamName: 'Argentina',
    primaryColor: '#74acdf',
    secondaryColor: '#ffffff',
    accentColor: '#f6b40e',
    textContrastColor: '#0f2042',
    borderColor: 'rgba(116, 172, 223, 0.3)',
    jerseyColor: '#74acdf',
  },
  FRA: {
    teamCode: 'FRA',
    teamName: 'Francia',
    primaryColor: '#071f4e',
    secondaryColor: '#ffffff',
    accentColor: '#e1001a',
    textContrastColor: '#ffffff',
    borderColor: 'rgba(7, 31, 78, 0.3)',
    jerseyColor: '#071f4e',
  },
  BRA: {
    teamCode: 'BRA',
    teamName: 'Brasil',
    primaryColor: '#fed103',
    secondaryColor: '#009c3a',
    accentColor: '#002776',
    textContrastColor: '#0f2042',
    borderColor: 'rgba(254, 209, 3, 0.3)',
    jerseyColor: '#fed103',
  },
  GER: {
    teamCode: 'GER',
    teamName: 'Alemania',
    primaryColor: '#ffffff',
    secondaryColor: '#000000',
    accentColor: '#d00000',
    textContrastColor: '#000000',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    jerseyColor: '#ffffff',
  },
  ESP: {
    teamCode: 'ESP',
    teamName: 'España',
    primaryColor: '#c60b1e',
    secondaryColor: '#ffc600',
    accentColor: '#002776',
    textContrastColor: '#ffffff',
    borderColor: 'rgba(198, 11, 30, 0.3)',
    jerseyColor: '#c60b1e',
  },
  NED: {
    teamCode: 'NED',
    teamName: 'Países Bajos',
    primaryColor: '#ff4f00',
    secondaryColor: '#ffffff',
    accentColor: '#21468b',
    textContrastColor: '#ffffff',
    borderColor: 'rgba(255, 79, 0, 0.3)',
    jerseyColor: '#ff4f00',
  },
};

export function getTeamVisualIdentity(teamCode: string, isHome: boolean = true): TeamVisualIdentity {
  const code = teamCode.toUpperCase();
  if (TEAM_VISUAL_IDENTITIES[code]) {
    return TEAM_VISUAL_IDENTITIES[code];
  }
  // Fallback dinámico genérico
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
