import React, { useMemo } from 'react';
import type { Player } from '../data/lineups';
import { Activity, Flame, X, ChevronLeft, Award } from 'lucide-react';
import { getTacticalZoneType } from '../data/lineups';
import { playerRatings, attrLabelsFor, attrColor, ratingSourceText } from '../../../lib/ratings';
import { generateDeterministicInsight } from '../data/stadiumDataMapper';
import { PlayerAvatar, TeamFlag } from '../../../components/identity';
import { DataSourceBadge } from '../../../components/DataSourceBadge';
import { playerRatingMeta } from '../../../generated/playerRatings';
import type { Player as SharedPlayer } from '@worldcup/shared';

interface SelectedPlayerPanelProps {
  player: Player;
  onClose: () => void;
  weather: 'clear' | 'rain' | 'snow' | 'fog';
  status: 'pre-match' | 'live' | 'post-match';
}

export const SelectedPlayerPanel: React.FC<SelectedPlayerPanelProps> = ({
  player,
  onClose,
  weather: _weather,
  status: _status
}) => {
  const ratings = useMemo(() => playerRatings({
    ...player,
    pos: player.pos || player.position
  }), [player]);
  
  const labels = useMemo(() => attrLabelsFor({
    pos: player.pos || player.position
  }), [player]);

  // Dynamic tactical insight generator (AI-native simulation - Phase 9 & 10)
  const aiInsight = useMemo(() => {
    return generateDeterministicInsight(player, ratings);
  }, [player, ratings]);

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
      style={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Panel Header */}
      <div 
        className="panel-header" 
        style={{ 
          padding: '8px 12px', 
          borderBottom: '1px solid var(--border-subtle)', 
          background: 'rgba(255,255,255,0.01)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexShrink: 0 
        }}
      >
        <button 
          onClick={onClose}
          className="stadium-btn"
          style={{ padding: '3px 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px', height: '22px', borderRadius: '4px' }}
        >
          <ChevronLeft size={10} /> Volver
        </button>
        <h3 className="panel-title" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: 0 }}>
          Ficha del Jugador
        </h3>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <X size={14} />
        </button>
      </div>

      <div 
        className="panel-content" 
        style={{ 
          padding: '12px', 
          gap: '12px', 
          overflowY: 'auto', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        {/* Profile Hero Card */}
        <div 
          className="stadium-card" 
          style={{ 
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderLeft: `4px solid ${teamGlowColor}`,
            borderRadius: '12px',
            position: 'relative',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            padding: '14px', 
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
            opacity: 0.03,
            userSelect: 'none',
            pointerEvents: 'none',
            lineHeight: 1,
            zIndex: 0
          }}>
            #{player.number}
          </div>

          <div className="row gap-12" style={{ alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ position: 'relative', flex: 'none', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px' }}>
              <PlayerAvatar player={player as unknown as SharedPlayer} size={48} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: '1.2' }}>
                  {player.name}
                </span>
                <span className="num" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  #{player.number}
                </span>
              </div>
              
              <div className="row gap-6" style={{ flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                {/* Rating Small Badge */}
                <span
                  className="num"
                  style={{
                    background: 'linear-gradient(150deg, var(--gold-2), var(--gold))',
                    color: '#181203',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    lineHeight: 1,
                  }}
                  title="Valoración General"
                >
                  {ratings.overall} GRL
                </span>
                
                <span className={`pos-tag pos-${player.position}`} style={{ fontSize: '0.62rem', padding: '1px 4px' }}>
                  {player.position}
                </span>

                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  <TeamFlag code={player.team} size={11} />
                  <span>{player.team === 'ARG' ? 'ARG' : 'FRA'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Subtext info: Club */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', zIndex: 1, borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '2px' }}>
            Club: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{player.club || '—'}</span>
          </div>

          {/* Rating Source row */}
          <div className="row gap-8" style={{ zIndex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`rating-source ${ratings.source}`} style={{ fontSize: '0.62rem', padding: '2px 5px', borderRadius: '4px' }} title={ratingSourceText(ratings)}>
              {ratings.source === 'fc26' ? 'FC 26' : 'Estimado'}
            </span>
            <DataSourceBadge
              label={ratings.source === 'fc26' ? 'Rating FC 26' : 'Rating estimado'}
              source={ratings.sourceLabel}
              date={ratings.source === 'fc26' ? playerRatingMeta.downloadedAt.slice(0, 10) : '2026-05-30'}
              confidence={ratings.source === 'fc26' ? 'Alta' : 'Media'}
              compact
            />
          </div>

          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px', zIndex: 1 }}>
            Rol: <span style={{ color: teamGlowColor }}>{player.tacticalRole}</span> · Zona: <span style={{ color: 'var(--text-primary)' }}>{getTacticalZoneType(player)}</span>
          </div>
        </div>

        {/* Stats Reales Card */}
        <div 
          className="stadium-card" 
          style={{ 
            padding: '12px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '12px' 
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Atributos Reales
          </div>
          <div className="row player-attrs" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0, justifyContent: 'space-between', gap: '6px' }}>
            {labels.map((a) => (
              <div key={a.key} style={{ textAlign: 'center', flex: 1 }}>
                <div className="num" style={{ fontWeight: 800, fontSize: '0.9rem', color: attrColor(ratings[a.key]) }}>
                  {ratings[a.key]}
                </div>
                <div className="mono-label" style={{ margin: 0, fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                  {a.short}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Stamina Indicator */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={10} style={{ color: player.stamina < 70 ? 'var(--color-neon-red)' : 'var(--accent-emerald)' }} />
              Condición
            </span>
            <span className="num" style={{ fontSize: '1.1rem', fontWeight: 800, color: player.stamina < 70 ? 'var(--color-neon-red)' : 'var(--accent-emerald)' }}>
              {player.stamina}%
            </span>
            <div style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${player.stamina}%`, 
                background: player.stamina < 70 ? 'var(--color-neon-red)' : 'var(--accent-emerald)',
              }}></div>
            </div>
          </div>

          {/* Influence Indicator */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={10} style={{ color: teamGlowColor }} />
              Influencia
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span className="num" style={{ fontSize: '1.1rem', fontWeight: 800, color: teamGlowColor }}>
                {player.influenceScore}
              </span>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>/100</span>
            </div>
            <div style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${player.influenceScore}%`, 
                background: teamGlowColor,
              }}></div>
            </div>
          </div>

          {/* Riesgo Badge */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Riesgo
            </span>
            <span 
              className="brand-badge" 
              style={{ 
                background: `rgba(${player.riskLevel === 'critico' || player.riskLevel === 'alto' ? '239, 68, 68' : '16, 185, 129'}, 0.1)`, 
                color: riskColor,
                borderColor: riskColor,
                border: '1px solid',
                fontSize: '0.55rem',
                fontWeight: 800,
                padding: '2px 4px',
                borderRadius: '4px',
                textAlign: 'center',
                display: 'block',
                marginTop: 'auto'
              }}
            >
              {player.riskLevel.toUpperCase()}
            </span>
          </div>

          {/* Estado del Jugador */}
          <div className="stadium-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Estado
            </span>
            <span 
              className="brand-badge" 
              style={{ 
                background: player.stamina < 70 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : player.influenceScore > 85 
                  ? 'rgba(0, 242, 254, 0.1)' 
                  : 'rgba(16, 185, 129, 0.1)', 
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
                fontSize: '0.55rem',
                fontWeight: 800,
                padding: '2px 4px',
                borderRadius: '4px',
                textAlign: 'center',
                display: 'block',
                marginTop: 'auto'
              }}
            >
              {player.stamina < 70 ? 'FATIGA' : player.influenceScore > 88 ? 'CLAVE' : 'ESTABLE'}
            </span>
          </div>
        </div>

        {/* Cobertura / Presión Row */}
        <div className="stadium-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} style={{ color: teamGlowColor }} />
            {player.position === 'DF' || player.position === 'GK' || player.id === 'fra-dm-r' || player.id === 'arg-dm' ? 'Cobertura Táctica' : 'Presión Generada'}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {Math.round(player.influenceScore * 0.85 + player.stamina * 0.15)}%
          </span>
        </div>

        {/* AI Tactical Narrative */}
        <div className="stadium-card" style={{ padding: '12px', background: `${teamGlowColor}03`, borderColor: `${teamGlowColor}20`, border: '1px solid', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Flame size={12} style={{ color: teamGlowColor }} />
            <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: teamGlowColor, letterSpacing: '0.05em' }}>
              Análisis Táctico IA
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', lineHeight: '1.4', color: 'var(--text-primary)', margin: 0 }}>
            {aiInsight.length > 180 ? `${aiInsight.substring(0, 177)}...` : aiInsight}
          </p>
        </div>

        {/* Action controls for the player */}
        <div 
          className="stadium-card"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '12px',
            padding: '12px'
          }}
        >
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acciones Contextuales
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button 
              type="button"
              className="stadium-btn active"
              style={{ 
                justifyContent: 'flex-start', 
                fontSize: '0.72rem', 
                padding: '6px 10px',
                borderColor: `${teamGlowColor}30`,
                background: `linear-gradient(90deg, ${teamGlowColor}10 0%, transparent 100%)`,
                textAlign: 'left',
                height: '30px'
              }}
            >
              <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: teamGlowColor, marginRight: '4px' }}></span>
              Ver Radar de Pases
            </button>

            <button 
              type="button"
              className="stadium-btn"
              style={{ 
                justifyContent: 'flex-start', 
                fontSize: '0.72rem', 
                padding: '6px 10px',
                textAlign: 'left',
                height: '30px'
              }}
            >
              Ver Zona de Influencia
            </button>

            <button 
              type="button"
              className="stadium-btn"
              style={{ 
                justifyContent: 'flex-start', 
                fontSize: '0.72rem', 
                padding: '6px 10px',
                textAlign: 'left',
                height: '30px'
              }}
            >
              Comparar Duelo Directo
            </button>
          </div>

          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3, marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            Prototipo privado no oficial de análisis deportivo. No está afiliado a FIFA, organizadores del torneo, selecciones ni sedes oficiales.
          </div>
        </div>
      </div>
    </div>
  );
};
