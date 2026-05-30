import { useMemo } from 'react';
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
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <span className="mono-label">Eliminatoria proyectada · los ganadores avanzan por ranking FIFA hasta que haya resultados</span>
      </div>

      <div className="scroll-x">
        <div className="bracket">
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
              <img className="bk-cup" src="/brand/fwc26-emblem.svg" alt="FIFA World Cup 26 trophy" loading="lazy" />
              {champion ? (
                <>
                  <TeamCrest code={champion} size={48} />
                  <strong>{teams[champion]?.name ?? champion}</strong>
                </>
              ) : (
                <span className="muted">TBD</span>
              )}
              <span className="mono-label">Campeón proyectado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketSide({ code, win, onClick }: { code: string; win: boolean; onClick: () => void }) {
  return (
    <div className={`bk-side${win ? ' win' : code ? '' : ' lose'}`} onClick={onClick} style={{ cursor: code ? 'pointer' : 'default' }}>
      {code ? <TeamCrest code={code} size={20} /> : <span style={{ width: 20 }} />}
      <span className="bk-name">{code || 'TBD'}</span>
      {win && <Icon name="check" size={13} style={{ color: 'var(--gold-2)' }} />}
    </div>
  );
}
