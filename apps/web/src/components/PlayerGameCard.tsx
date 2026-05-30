import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import type { Player } from '@worldcup/shared';
import { ATTR_LABELS, attrColor, playerRatings } from '@/lib/ratings';
import { PlayerAvatar, TeamFlag } from './identity';
import { useTeamsMap } from '@/hooks';

/** Original "game-card" style view: overall + power gauge + radar + attribute bars.
 *  Attributes are illustrative/generated — not real ratings. */
export function PlayerGameCard({ p }: { p: Player }) {
  const teams = useTeamsMap();
  const t = teams[p.team];
  const r = playerRatings(p);
  const radarData = ATTR_LABELS.map((a) => ({ label: a.short, value: r[a.key] }));

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${t?.colorA ?? '#888'}, ${t?.colorB ?? '#888'})` }} />
      <div className="card-pad">
        <div className="row gap-16 wrap" style={{ alignItems: 'flex-start' }}>
          {/* identity + power gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 120 }}>
            <div style={{ position: 'relative' }}>
              <PlayerAvatar player={p} size={92} />
              <span
                className="num"
                style={{
                  position: 'absolute',
                  top: -8,
                  left: -10,
                  background: 'linear-gradient(150deg, var(--gold-2), var(--gold))',
                  color: '#181203',
                  fontWeight: 800,
                  fontSize: 18,
                  padding: '2px 8px',
                  borderRadius: 8,
                  boxShadow: 'var(--shadow)',
                }}
              >
                {r.overall}
              </span>
            </div>
            <span className={`pos-tag pos-${p.pos}`} style={{ fontSize: 12 }}>
              {p.posLong ?? p.pos}
            </span>
            <Gauge value={r.overall} />
          </div>

          {/* radar */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row gap-8" style={{ marginBottom: 4 }}>
              <TeamFlag code={p.team} size={14} />
              <span className="mono-label" style={{ margin: 0 }}>
                #{p.number ?? '—'} · {p.club}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--line-2)" />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--tx-2)' }} />
                <Radar dataKey="value" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* attribute bars */}
        <div className="kpi-grid" style={{ marginTop: 8 }}>
          {ATTR_LABELS.map((a) => {
            const v = r[a.key];
            return (
              <div key={a.key}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 3 }}>
                  <span className="mono-label" style={{ margin: 0 }}>
                    {a.es}
                  </span>
                  <span className="num" style={{ fontWeight: 700, color: attrColor(v) }}>
                    {v}
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${v}%`, background: attrColor(v) }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mono-label" style={{ marginTop: 12 }}>
          Atributos ilustrativos · generados, no oficiales · no son ratings de ningún videojuego
        </div>
      </div>
    </div>
  );
}

/** Circular power gauge for the overall. */
function Gauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      style={{
        width: 78,
        height: 78,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: `conic-gradient(var(--gold) ${pct}%, var(--bg-3) 0)`,
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'var(--bg-2)',
          display: 'grid',
          placeItems: 'center',
          flexDirection: 'column',
        }}
      >
        <span className="num" style={{ fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
          {value}
        </span>
        <span className="mono-label" style={{ margin: 0, fontSize: 8 }}>
          GENERAL
        </span>
      </div>
    </div>
  );
}
