/**
 * Spanish dictionary (default language). Keys are dot-namespaced by domain.
 * The English file (en.ts) mirrors this exact shape — keep them in sync.
 * Professional, premium sports tone — not literal.
 */
export const es = {
  lang: { es: 'Español', en: 'Inglés', label: 'Idioma' },

  nav: {
    groupCommand: 'Centro de mando',
    groupExplore: 'Explorar',
    groupPersonal: 'Personal',
    home: 'Panel',
    matches: 'Partidos',
    tv: 'Modo TV',
    bracket: 'Eliminatorias',
    teams: 'Selecciones',
    players: 'Jugadores',
    standings: 'Grupos y tabla',
    stats: 'Estadísticas',
    stadium: 'Estadio 3D',
    venues: 'Sedes',
    pool: 'Quiniela',
    favorites: 'Favoritos',
    data: 'Datos',
    analyst: 'Analista IA',
  },

  titles: {
    home: 'Panel',
    matches: 'Centro de partidos',
    tv: 'Modo TV',
    bracket: 'Eliminatorias',
    teams: 'Selecciones',
    players: 'Jugadores',
    standings: 'Grupos y clasificación',
    stats: 'Estadísticas',
    venues: 'Sedes',
    favorites: 'Favoritos',
    pool: 'Quiniela',
    data: 'Centro de datos',
    analyst: 'Analista de partidos IA',
    stadium: 'Estadio 3D',
  },

  role: {
    admin: 'Admin',
    family: 'Estándar',
    guest: 'Invitado',
    label: 'Rol de uso',
    active: 'Rol activo',
  },

  common: {
    search: 'Buscar jugadores, clubes…',
    loading: 'Cargando…',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    share: 'Compartir',
    retry: 'Reintentar',
    back: 'Volver',
    viewMatch: 'Ver partido',
    skipToContent: 'Ir al contenido principal',
    installApp: 'Instalar app',
    live: 'EN VIVO',
    menu: 'Menú',
    logout: 'Salir',
    dataBadge: 'Datos',
  },

  states: {
    offline: 'Sin conexión — mostrando datos en caché.',
    offlineTitle: 'Modo sin conexión activo',
    offlineBody: 'Tus predicciones se guardarán localmente y se sincronizarán al recuperar señal.',
    errorTitle: 'Error inesperado',
    errorBody: 'Algo salió mal al cargar esta sección. Intenta recargar la página.',
    reload: 'Recargar página',
    empty: 'Sin datos por ahora',
  },

  footer: {
    brand: 'Copa 2026 · AI Command Center',
    tagline: 'Proyecto personal · sin afiliación oficial.',
    calendar: 'Calendario del Torneo',
    privateNote: 'Dashboard privado.',
    notForDistribution: 'No es para distribución pública.',
  },

  data: {
    simulated: 'Datos simulados',
    estimated: 'Datos estimados',
    official: 'Datos oficiales',
    derived: 'Datos derivados',
    pending: 'Pendiente',
    mockBanner: 'Datos de demostración — se reemplazan con datos reales al jugarse los partidos.',
  },

  disclaimer: {
    full: 'Esta es una demo privada/no oficial. No está afiliada, respaldada ni autorizada por FIFA, federaciones, selecciones, ligas, jugadores o marcas oficiales. Algunos datos pueden ser simulados, estimados o curados manualmente para fines demostrativos.',
    footer: 'No oficial · sin afiliación con la FIFA · calendario del torneo.',
    unofficial: 'No oficial',
    notAffiliated: 'No afiliado',
    personalDemo: 'Uso personal / demo',
  },

  ai: {
    assistant: 'Asistente IA',
    analysis: 'Análisis IA',
    generated: 'Generado por IA',
    generatedAnalysis: 'Análisis generado por IA',
    simulatedPrediction: 'Predicción simulada',
    curatedData: 'Datos curados manualmente',
    notOfficialSource: 'No usar como fuente oficial',
    estimatedConfidence: 'Confianza estimada',
    prediction: 'Predicción',
    matchBrief: 'Resumen del partido',
    tacticalView: 'Vista táctica',
  },

  lineup: {
    lineup: 'Alineación',
    official: 'XI Oficial',
    estimated: 'XI Estimado',
    partial: 'XI Oficial · parcial',
  },
};

export type Dict = typeof es;
