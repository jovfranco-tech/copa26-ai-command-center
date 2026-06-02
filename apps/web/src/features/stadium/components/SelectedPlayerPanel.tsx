import React, { useMemo } from 'react';
import type { Player } from '../data/lineups';
import { Activity, Flame, X, ChevronLeft, Award } from 'lucide-react';
import { getTacticalZoneType } from '../data/lineups';

interface SelectedPlayerPanelProps {
  player: Player;
  onClose: () => void;
  weather: 'clear' | 'rain' | 'snow' | 'fog';
  status: 'pre-match' | 'live' | 'post-match';
}

export const SelectedPlayerPanel: React.FC<SelectedPlayerPanelProps> = ({
  player,
  onClose,
  weather,
  status
}) => {
  // Dynamic tactical insight generator (AI-native simulation - Phase 9)
  const aiInsight = useMemo(() => {
    const name = player.displayName;
    
    // Base tactical text based on role and stats
    let text: string;
    
    if (status === 'pre-match') {
      text = `Planificación Táctica: Se espera que ${player.displayName} actúe como un pilar en el esquema táctico. Su asignación principal es mantener la disciplina posicional en su rol de ${player.tacticalRole.toLowerCase()} para contrarrestar el bloque rival. `;
      if (weather === 'rain') {
        text += `Bajo lluvia intensa, se le instruye priorizar pases cortos y evitar conducciones largas en terreno mojado.`;
      } else if (weather === 'fog') {
        text += `Ante niebla densa, su comunicación y apoyos cortos serán vitales para evitar desatenciones de visibilidad.`;
      } else {
        text += `Las condiciones climáticas despejadas favorecerán su despliegue físico y transiciones rápidas.`;
      }
    } else if (status === 'post-match') {
      text = `Análisis de Rendimiento: ${player.displayName} concluyó con una influencia de ${player.influenceScore} puntos. Su desempeño como ${player.tacticalRole.toLowerCase()} fue clave para consolidar la estrategia y distribución. `;
      if (player.stamina < 75) {
        text += `El desgaste físico acumulado (${player.stamina}% restante) mermó ligeramente su velocidad de repliegue, pero sus coberturas mantuvieron el orden táctico.`;
      } else {
        text += `Mantuvo un excelente tono físico hasta el pitazo final, facilitando coberturas amplias y duelos individuales.`;
      }
    } else {
      // In-play Live Match Day Insights (82nd minute)
      if (player.id === 'arg-ss') { // Messi
        text = `Messi está operando de forma flotante entre líneas en la Zona 14. Atrae constantemente marcas dobles de Tchouaméni y Upamecano, lo que libera el carril exterior derecho para proyecciones de Molina o transiciones de De Paul.`;
      } else if (player.id === 'fra-lw') { // Mbappé
        text = `Mbappé explota la banda izquierda posicionándose de manera agresiva a la espalda de Molina. Su velocidad en ruptura vertical representa la mayor amenaza de Francia en estos últimos minutos, obligando coberturas de Romero.`;
      } else if (player.position === 'GK') {
        text = `${name} mantiene una alta concentración defensiva. Su rol de ${player.tacticalRole.toLowerCase()} requiere salidas rápidas ante balones filtrados y distribución rasa para saltar la primera línea de presión rival.`;
      } else if (player.position === 'DF') {
        text = `En la zaga central, ${name} está enfocado en contener balones al área. Con una condición del ${player.stamina}%, su capacidad de anticipación y bloqueos de remates de espaldas será el muro definitorio de este tramo final del partido.`;
      } else if (player.position === 'MF') {
        text = `El desgaste táctico de ${name} en el círculo central es masivo. En su rol de ${player.tacticalRole.toLowerCase()}, ejerce presión sobre el eje organizador contrario y distribuye balones con alta precisión en Zona 14.`;
      } else {
        text = `Posicionado en ofensiva, ${name} busca fijar a los defensores contrarios y generar desmarques de apoyo. Su influencia táctica actual de ${player.influenceScore} puntos está dinamizando las segundas jugadas de ataque.`;
      }

      // Add environmental modifiers
      if (weather === 'rain') {
        text += ` El terreno mojado por lluvia está acelerando la velocidad del esférico, incrementando su tasa de pases al primer toque.`;
      } else if (weather === 'fog') {
        text += ` La niebla densa reduce la visibilidad espacial; se le ordena mantener distancias más compactas con sus compañeros de bloque.`;
      }
    }

    return text;
  }, [player, weather, status]);

  // Risk badge styling
  const riskColor = useMemo(() => {
    switch (player.riskLevel) {
      case 'critico': return 'var(--color-neon-red)';
      case 'alto': return 'var(--accent-orange)';
      case 'medio': return 'var(--color-neon-yellow)';
      case 'bajo':
      default:
        return 'var(--accent-emerald)';
    }
  }, [player.riskLevel]);

  // Team accent border color
  const teamGlowColor = useMemo(() => {
    if (player.team === 'ARG') {
      return player.position === 'GK' ? '#fbbf24' : 'var(--accent-cyan)';
    } else {
      return player.position === 'GK' ? 'var(--accent-emerald)' : 'var(--color-neon-red)';
    }
  }, [player]);

  return (
    <div 
      className="panel-container" 
      style={{ 
        border: `1px solid ${teamGlowColor}`,
        boxShadow: `0 0 24px ${teamGlowColor}20`,
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'rgba(8, 11, 24, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Panel Header */}
      <div className="panel-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={onClose}
          className="stadium-btn"
          style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', height: '24px', borderRadius: '6px' }}
        >
          <ChevronLeft size={12} /> Volver
        </button>
        <h3 className="panel-title" style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff' }}>
          Ficha del Jugador
        </h3>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="panel-content" style={{ padding: '16px', gap: '14px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Profile Hero Card */}
        <div 
          className="stadium-card" 
          style={{ 
            display: 'flex', 
            position: 'relative',
            flexDirection: 'column', 
            gap: '8px', 
            padding: '16px', 
            borderLeft: `4px solid ${teamGlowColor}`,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.0) 100%)',
            overflow: 'hidden'
          }}
        >
          {/* Huge watermark number in background */}
          <div style={{
            position: 'absolute',
            right: '-10px',
            bottom: '-25px',
            fontSize: '5rem',
            fontWeight: 900,
            color: teamGlowColor,
            opacity: 0.12,
            userSelect: 'none',
            pointerEvents: 'none',
            lineHeight: 1
          }}>
            #{player.number}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
            <span 
              className="brand-badge" 
              style={{ 
                background: player.team === 'ARG' ? '#74acdf' : '#0f2042', 
                color: player.team === 'ARG' ? '#0b1731' : '#fff', 
                boxShadow: `0 0 10px ${player.team === 'ARG' ? 'rgba(116, 172, 223, 0.3)' : 'rgba(15, 32, 66, 0.3)'}`,
                fontSize: '0.62rem',
                fontWeight: 800,
                borderRadius: '4px',
                padding: '2px 8px'
              }}
            >
              {player.team === 'ARG' ? 'ARGENTINA' : 'FRANCIA'}
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: teamGlowColor, lineHeight: 1 }}>
              #{player.number}
            </span>
          </div>

          <div style={{ zIndex: 1 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              {player.name}
            </h2>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>
              {player.positionLabel} · <span style={{ color: teamGlowColor }}>{player.tacticalRole}</span>
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.02em' }}>
              Zona Táctica: <span style={{ color: '#ffffff' }}>{getTacticalZoneType(player)}</span>
            </div>
          </div>
        </div>

        {/* Tactical Performance Gauges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Stamina Indicator */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={10} style={{ color: player.stamina < 70 ? 'var(--color-neon-red)' : 'var(--accent-emerald)' }} />
              Condición Física
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: player.stamina < 70 ? 'var(--color-neon-red)' : 'var(--accent-emerald)' }}>
                {player.stamina}%
              </span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${player.stamina}%`, 
                background: player.stamina < 70 ? 'var(--color-neon-red)' : 'var(--accent-emerald)',
                borderRadius: '4px'
              }}></div>
            </div>
          </div>

          {/* Influence Indicator */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={10} style={{ color: teamGlowColor }} />
              Influencia Táctica
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: teamGlowColor }}>
                {player.influenceScore}
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, marginLeft: '2px' }}>/ 100</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${player.influenceScore}%`, 
                background: teamGlowColor,
                borderRadius: '4px'
              }}></div>
            </div>
          </div>
        </div>

        {/* Row 2 of Metrics: Riesgo and Estado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Riesgo Badge */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Riesgo de Pérdida
            </span>
            <span 
              className="brand-badge" 
              style={{ 
                background: `rgba(${player.riskLevel === 'critico' || player.riskLevel === 'alto' ? '239, 68, 68' : '16, 185, 129'}, 0.15)`, 
                color: riskColor,
                borderColor: riskColor,
                border: '1px solid',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                textAlign: 'center',
                display: 'block',
                marginTop: '2px'
              }}
            >
              {player.riskLevel.toUpperCase()}
            </span>
          </div>

          {/* Estado del Jugador */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Estado del Jugador
            </span>
            <span 
              className="brand-badge" 
              style={{ 
                background: player.stamina < 70 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : player.influenceScore > 85 
                  ? 'rgba(0, 242, 254, 0.15)' 
                  : 'rgba(16, 185, 129, 0.15)', 
                color: player.stamina < 70 
                  ? 'var(--color-neon-red)' 
                  : player.influenceScore > 85 
                  ? 'var(--accent-cyan)' 
                  : 'var(--accent-emerald)',
                borderColor: player.stamina < 70 
                  ? 'var(--color-neon-red)' 
                  : player.influenceScore > 85 
                  ? 'var(--accent-cyan)' 
                  : 'var(--accent-emerald)',
                border: '1px solid',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                textAlign: 'center',
                display: 'block',
                marginTop: '2px'
              }}
            >
              {player.stamina < 70 ? 'FATIGA' : player.influenceScore > 88 ? 'CLAVE OFENSIVA' : 'ESTABLE'}
            </span>
          </div>
        </div>

        {/* Cobertura / Presión Row */}
        <div className="stadium-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} style={{ color: teamGlowColor }} />
            {player.position === 'DF' || player.position === 'GK' || player.id === 'fra-dm-r' || player.id === 'arg-dm' ? 'Cobertura Táctica' : 'Presión Generada'}
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
            {Math.round(player.influenceScore * 0.85 + player.stamina * 0.15)}%
          </span>
        </div>

        {/* AI Tactical Narrative */}
        <div className="stadium-card" style={{ padding: '14px', background: `${teamGlowColor}03`, borderColor: `${teamGlowColor}1f` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Flame size={12} style={{ color: teamGlowColor }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: teamGlowColor, letterSpacing: '0.05em' }}>
              Análisis Táctico IA (Simulado)
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', lineHeight: '1.45', color: '#e2e8f0', margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {aiInsight}
          </p>
        </div>

        {/* Action controls for the player */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acciones Contextuales
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              className="stadium-btn active"
              style={{ 
                justifyContent: 'flex-start', 
                fontSize: '0.75rem', 
                padding: '10px 12px',
                borderColor: `${teamGlowColor}40`,
                background: `linear-gradient(90deg, ${teamGlowColor}15 0%, transparent 100%)`,
                textAlign: 'left'
              }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: teamGlowColor, marginRight: '4px' }}></span>
              Ver Radar de Pases (Activo)
            </button>

            <button 
              className="stadium-btn"
              style={{ 
                justifyContent: 'flex-start', 
                fontSize: '0.75rem', 
                padding: '10px 12px',
                textAlign: 'left'
              }}
            >
              Ver Zona de Influencia
            </button>

            <button 
              className="stadium-btn"
              style={{ 
                justifyContent: 'flex-start', 
                fontSize: '0.75rem', 
                padding: '10px 12px',
                textAlign: 'left'
              }}
            >
              Comparar Duelo Directo
            </button>
          </div>

          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3, marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
            Prototipo privado no oficial de análisis deportivo. No está afiliado a FIFA, organizadores del torneo, selecciones ni sedes oficiales.
          </div>
        </div>
      </div>
    </div>
  );
};
