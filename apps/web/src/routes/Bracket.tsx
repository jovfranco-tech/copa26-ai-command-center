import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Empty } from '@worldcup/ui';
import { mock } from '@worldcup/shared';
import { TeamCrest } from '@/components/identity';
import { MockBanner } from '@/components/MockBanner';
import { useTeamsMap } from '@/hooks';

const ROUND_NAMES = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinales', 'Final'];

export function Bracket() {
  const navigate = useNavigate();
  const teams = useTeamsMap();

  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const rounds = useMemo(() => {
    const better = (a: string, b: string) => {
      if (!a) return b;
      if (!b) return a;
      const ra = teams[a]?.ranking ?? 999;
      const rb = teams[b]?.ranking ?? 999;
      return ra <= rb ? a : b;
    };
    const out: Array<Array<[string, string]>> = [];
    let pairs = mock.BRACKET.r32 as Array<[string, string]>;
    out.push(pairs);
    while (pairs.length > 1) {
      const winners = pairs.map(([a, b]) => better(a, b));
      const next: Array<[string, string]> = [];
      for (let i = 0; i < winners.length; i += 2) next.push([winners[i] ?? '', winners[i + 1] ?? '']);
      out.push(next);
      pairs = next;
    }
    return out;
  }, [teams]);

  const champion = (() => {
    const last = rounds[rounds.length - 1]?.[0];
    if (!last) return '';
    const [a, b] = last;
    const ra = teams[a]?.ranking ?? 999;
    const rb = teams[b]?.ranking ?? 999;
    return ra <= rb ? a : b;
  })();

  const hasBracket = mock.BRACKET.r32.length > 0;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    setPanX(touch.clientX - dragStart.x);
    setPanY(touch.clientY - dragStart.y);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetZoomPan = () => {
    setZoom(100);
    setPanX(0);
    setPanY(0);
  };

  if (!hasBracket) {
    return (
      <div className="page-fade">
        <MockBanner />
        <Empty
          icon="bracket"
          title="Eliminatorias — por definir"
          text="Los dieciseisavos se definen tras la fase de grupos (desde el 28 de junio de 2026). Aparecerán aquí cuando haya resultados."
        />
      </div>
    );
  }

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="card card-pad" style={{ marginBottom: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--tx-2)' }}>
        <Icon name="info" size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span><strong>Proyección simulada.</strong> Este bracket muestra resultados estimados basados en rankings FIFA. No son resultados reales. Se actualizará con datos oficiales cuando concluya la fase de grupos.</span>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Icon name="grid" size={15} style={{ color: 'var(--gold)' }} />
        <span className="mono-label" style={{ flex: 1, margin: 0 }}>
          Eliminatoria proyectada · Arrastra para mover · Usa el zoom para ampliar
        </span>
        <div className="row gap-8" style={{ alignItems: 'center' }}>
          <button type="button" className="btn ghost btn-sm" onClick={() => setZoom(z => Math.max(50, z - 10))} title="Alejar" style={{ padding: '0 10px', height: 28, fontWeight: 700 }}>
            -
          </button>
          <span className="num" style={{ fontSize: 12, minWidth: 44, textAlign: 'center', fontWeight: 700 }}>{zoom}%</span>
          <button type="button" className="btn ghost btn-sm" onClick={() => setZoom(z => Math.min(150, z + 10))} title="Acercar" style={{ padding: '0 10px', height: 28, fontWeight: 700 }}>
            +
          </button>
          <input
            type="range"
            min={50}
            max={150}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: 100, height: 4, cursor: 'pointer' }}
          />
          <button type="button" className="btn ghost btn-sm" onClick={resetZoomPan} style={{ height: 28, padding: '0 12px', fontSize: 12, fontWeight: 600 }}>
            Restablecer
          </button>
        </div>
      </div>

      <div
        className="bracket-outer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r)',
          background: 'var(--bg-2)',
          minHeight: '620px',
          width: '100%',
        }}
      >
        <div
          className="bracket-inner"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom / 100})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            willChange: 'transform',
            padding: '30px',
            width: 'max-content',
          }}
        >
          <div className="bracket" style={{ padding: 0 }}>
            {rounds.map((round, ri) => (
              <div key={ri} className="bk-col">
                <div className="bk-round mono-label">{ROUND_NAMES[ri] ?? `Round ${ri + 1}`}</div>
                {round.map(([a, b], mi) => {
                  const ra = teams[a]?.ranking ?? 999;
                  const rb = teams[b]?.ranking ?? 999;
                  const aWin = a && ra <= rb;
                  const bWin = b && rb < ra;
                  return (
                    <div key={mi} className="bk-match">
                      <BracketSide code={a} win={!!aWin} onClick={() => a && navigate({ to: '/teams/$code', params: { code: a } })} />
                      <BracketSide code={b} win={!!bWin} onClick={() => b && navigate({ to: '/teams/$code', params: { code: b } })} />
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="bk-col" style={{ justifyContent: 'center' }}>
              <div className="bk-round mono-label">Campeón</div>
              <div className="card bk-champ">
                <img className="bk-cup" src="/brand/fwc26-emblem.svg" alt="Copa 2026 trophy" loading="lazy" />
                {champion ? (
                  <>
                    <TeamCrest code={champion} size={48} />
                    <strong>{teams[champion]?.name ?? champion}</strong>
                  </>
                ) : (
                  <span className="muted">TBD</span>
                )}
                <span className="mono-label">Campeón proyectado (simulado)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketSide({ code, win, onClick }: { code: string; win: boolean; onClick: () => void }) {
  return (
    <div
      className={`bk-side${win ? ' win' : code ? '' : ' lose'}`}
      onClick={onClick}
      role={code ? 'button' : undefined}
      tabIndex={code ? 0 : undefined}
      onKeyDown={code ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{ cursor: code ? 'pointer' : 'default' }}
    >
      {code ? <TeamCrest code={code} size={20} /> : <span style={{ width: 20 }} />}
      <span className="bk-name">{code || 'TBD'}</span>
      {win && <Icon name="check" size={13} style={{ color: 'var(--gold-2)' }} />}
    </div>
  );
}
