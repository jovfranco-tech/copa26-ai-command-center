import { Icon } from '@worldcup/ui';
import type { Match } from '@worldcup/shared';

export function TournamentTimeline({ matches }: { matches: Match[] }) {
  const groupMatches = matches.filter((m) => m.stage.toLowerCase().includes('group'));
  const first = groupMatches[0]?.date ?? '2026-06-11';
  const last = groupMatches[groupMatches.length - 1]?.date ?? '2026-06-24';
  const played = matches.filter((m) => m.status === 'FT').length;

  const steps = [
    { label: 'Grupos', date: `${first} - ${last}`, status: played ? 'live' : 'next', note: `${groupMatches.length} partidos cargados` },
    { label: 'Dieciseisavos', date: 'Desde 2026-06-28', status: 'wait', note: 'Se llena con posiciones reales' },
    { label: 'Octavos', date: 'Julio 2026', status: 'wait', note: 'Cruces por definir' },
    { label: 'Cuartos', date: 'Julio 2026', status: 'wait', note: 'Cruces por definir' },
    { label: 'Semifinales', date: 'Julio 2026', status: 'wait', note: 'Cruces por definir' },
    { label: 'Final', date: '2026-07-19', status: 'cup', note: 'Copa al campeon' },
  ] as const;

  return (
    <div className="card tournament-timeline">
      <div className="card-hd">
        <Icon name="route" size={15} style={{ color: 'var(--gold)' }} />
        <h3>Timeline del torneo</h3>
        <span className="spacer" />
        <span className="mono-label">{played}/{matches.length} jugados</span>
      </div>
      <div className="timeline-track">
        {steps.map((step) => (
          <div key={step.label} className={`timeline-step ${step.status}`}>
            <span className="timeline-dot">
              <Icon name={step.status === 'cup' ? 'trophy' : step.status === 'next' ? 'calendar' : 'clock'} size={14} />
            </span>
            <strong>{step.label}</strong>
            <span className="mono-label">{step.date}</span>
            <p>{step.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

