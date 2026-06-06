/**
 * Display-time localization for stadium tactical-role strings.
 *
 * The 3D stadium authors its tactical roles in Spanish (the canonical key) inside
 * the slot templates of stadiumDataMapper.ts. Rather than thread a second language
 * through every slot definition, we translate at the display site: the Spanish
 * string IS the lookup key, so the data layer stays single-source and any role not
 * present in the map simply falls back to its (Spanish) original — nothing breaks.
 *
 * Player names, team names and DB position labels (posLong) remain data and are
 * shown as-is across the whole app, so they are intentionally NOT translated here.
 */
import type { Lang } from '@/store/preferences';

/** Spanish canonical tactical role → professional English equivalent. */
const ROLE_EN: Record<string, string> = {
  // ── Goalkeepers ──
  'Portero de Línea y Cierre': 'Sweeper-Line Goalkeeper',
  'Portero Líbano de Distribución': 'Ball-Playing Sweeper-Keeper',
  'Portero de Cierre Línea': 'Line-Sweeping Goalkeeper',
  'Portero de Cobertura y Salida': 'Covering Build-Up Goalkeeper',
  'Portero de Salida Rápida': 'Quick-Release Goalkeeper',
  'Portero Cierre de Área': 'Box-Commanding Goalkeeper',
  'Portero de Bloque': 'Block-Anchoring Goalkeeper',
  // ── Full-backs / wing-backs ──
  'Carrilero de Proyección': 'Attacking Wing-Back',
  'Carrilero de Proyección Total': 'All-Action Wing-Back',
  'Carrilero de Progresión Total': 'All-Action Wing-Back',
  'Carrilero de Transición Veloz': 'Quick Transition Wing-Back',
  'Carrilero Ofensivo de Transición': 'Attacking Transition Wing-Back',
  'Carrilero Ofensivo Rápido': 'Quick Attacking Full-Back',
  'Carrilero Ofensivo Técnico': 'Technical Attacking Wing-Back',
  'Lateral de Proyección': 'Overlapping Full-Back',
  'Lateral de Proyección Táctica': 'Tactical Overlapping Full-Back',
  'Lateral de Proyección Veloz': 'Quick Overlapping Full-Back',
  'Lateral Defensivo Invertido': 'Inverted Full-Back',
  'Lateral de Cierre Tercer Central': 'Tuck-In Full-Back',
  'Lateral de Cierre Banda': 'Touchline Containment Full-Back',
  'Lateral de Apoyo Defensivo': 'Defensive Support Full-Back',
  'Lateral Defensivo de Apoyo': 'Supporting Defensive Full-Back',
  'Lateral de Apoyo': 'Supporting Full-Back',
  // ── Centre-backs ──
  'Defensa Tapón Agresivo': 'Aggressive Stopper',
  'Defensa de Cobertura': 'Cover Defender',
  'Defensa de Cobertura Lateral': 'Wide Cover Defender',
  'Defensa de Cobertura Física': 'Physical Cover Defender',
  'Defensa de Cobertura y Cierre': 'Covering Sweeper Defender',
  'Defensa Marcador de Choque': 'Front-Foot Marker',
  'Defensa Marcador Físico': 'Physical Man-Marker',
  'Defensa Marcador de Salida': 'Ball-Playing Marker',
  'Defensa Escudo de Anticipación': 'Anticipation Shield Defender',
  'Defensa Escudo Anticipación': 'Anticipation Shield Defender',
  'Defensa Escudo y Anticipo': 'Shielding Anticipation Defender',
  'Defensa Libero y Cierre': 'Sweeping Libero',
  'Defensa de Anticipación': 'Anticipation Defender',
  'Defensa de Cierre Físico': 'Physical Containment Defender',
  'Defensa de Salida y Cobertura': 'Build-Up Cover Defender',
  'Defensa Central de Choque': 'Front-Foot Centre-Back',
  'Defensa Central de Bloque': 'Block Centre-Back',
  'Defensa Central': 'Centre-Back',
  // ── Midfielders ──
  'Interior Box-to-Box': 'Box-to-Box Midfielder',
  'Interior Box-to-Box Dinámico': 'Dynamic Box-to-Box Midfielder',
  'Interior Box-to-Box Mixto': 'Two-Way Box-to-Box Midfielder',
  'Interior Box-to-Box Pasador': 'Passing Box-to-Box Midfielder',
  'Interior Creativo / Enlace': 'Creative Link Midfielder',
  'Interior Creativo Enlace': 'Creative Link Midfielder',
  'Interior Organizador Posicional': 'Positional Playmaking Midfielder',
  'Interior de Enlace y Presión': 'Link-and-Press Midfielder',
  'Interior Mixto de Salida': 'Two-Way Build-Up Midfielder',
  'Interior de Enlace': 'Link Midfielder',
  'Pivote Organizador': 'Deep-Lying Playmaker',
  'Pivote Organizador de Salida': 'Build-Up Playmaking Pivot',
  'Pivote Organizador y Recuperador': 'Two-Way Deep Playmaker',
  'Pivote Organizador Técnico': 'Technical Deep Playmaker',
  'Pivote Ancla Destructor': 'Anchor Ball-Winner',
  'Pivote Ancla Defensivo': 'Defensive Anchor',
  'Pivote Mixto de Salida': 'Two-Way Build-Up Pivot',
  'Pivote Destructor': 'Ball-Winning Pivot',
  'Pivote Ofensivo del Área': 'Penalty-Box Target Forward',
  'Pivote de Contención y Salida': 'Holding Build-Up Pivot',
  'Pivote de Contención': 'Holding Midfielder',
  'Doble Pivote': 'Double Pivot',
  'Mediocentro Organizador': 'Deep-Lying Organiser',
  'Mediocentro Creador Dinámico': 'Dynamic Creative Midfielder',
  'Mediapunta Creativo Dinámico': 'Dynamic Attacking Midfielder',
  'Enganche de Conexión Creativa': 'Creative Link Playmaker',
  'Organizador Libre Dinámico': 'Free-Roaming Playmaker',
  'Organizador Libre de Ataque': 'Free Attacking Playmaker',
  // ── Wingers / forwards ──
  'Extremo Puro de Amplitud': 'Touchline Winger',
  'Extremo de Amplitud': 'Width-Holding Winger',
  'Extremo Regateador en Aislamiento': 'Isolation Dribbling Winger',
  'Extremo Regateador Creativo': 'Creative Dribbling Winger',
  'Extremo de Desborde y Velocidad': 'Direct Pace Winger',
  'Extremo de Velocidad y Desborde': 'Direct Pace Winger',
  'Extremo Rápido de Desborde': 'Quick Beat-Your-Man Winger',
  'Extremo de Desborde': 'Beat-Your-Man Winger',
  'Presionador de Salida': 'Pressing Forward',
  'Presionador y Definidor': 'Pressing Finisher',
  'Delantero Interior de Explosividad': 'Explosive Inside Forward',
  'Delantero Interior Explosivo': 'Explosive Inside Forward',
  'Delantero Interior Rápido': 'Quick Inside Forward',
  'Delantero Interior de Velocidad': 'Pacey Inside Forward',
  'Delantero Móvil Asociativo': 'Mobile Link Forward',
  'Delantero de Área Objetivo': 'Target-Man Forward',
  'Delantero de Área Definidor': 'Penalty-Box Finisher',
  'Delantero de Área': 'Penalty-Box Forward',
  'Delantero Centro de Enlace': 'Link-Up Centre-Forward',
  'Delantero Centro de Presión': 'Pressing Centre-Forward',
  'Delantero Centro de Referencia': 'Reference Centre-Forward',
  'Delantero Centro': 'Centre-Forward',
  'Segundo Delantero de Conexión': 'Link-Up Second Striker',
  'Segundo Delantero de Movilidad': 'Mobile Second Striker',
};

/** Translate a tactical role for display. Spanish (the canonical) passes through. */
export function localizeRole(role: string, lang: Lang): string {
  if (lang === 'es') return role;
  return ROLE_EN[role] ?? role;
}
