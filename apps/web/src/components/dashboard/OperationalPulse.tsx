import { useNavigate } from '@tanstack/react-router';
import { Icon, type IconName } from '@worldcup/ui';
import type { Match, Team } from '@worldcup/shared';
import { buildDayBrief, buildPoolDiagnostics } from '@/lib/opsIntelligence';
import type { PoolPick } from '@/store/pool';

function PulseTile({ icon, label, value, text }: { icon: IconName; label: string; value: string; text: string }) {
  return (
    <div className="ops-pulse-tile">
      <Icon name={icon} size={14} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </div>
  );
}

export function OperationalPulse({
  matches,
  teams,
  picks,
  favoritesCount,
}: {
  matches: Match[];
  teams: Team[];
  picks: Record<string, PoolPick>;
  favoritesCount: number;
}) {
  const navigate = useNavigate();
  const brief = buildDayBrief(matches, teams, picks);
  const diagnostics = buildPoolDiagnostics(matches, picks);
  return (
    <section className="ops-pulse-board">
      <div className="ops-pulse-main">
        <span className="mono-label">Centro operativo</span>
        <strong>{brief.title}</strong>
        <p>{brief.subtitle}</p>
        <div className="ops-pulse-actions">
          <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
            <Icon name="trophy" size={14} /> Completar quiniela
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/analyst' })}>
            <Icon name="ai" size={14} /> Pedir plan IA
          </button>
        </div>
      </div>
      <div className="ops-pulse-grid">
        <PulseTile icon="target" label="Picks" value={`${diagnostics.coveragePct}%`} text={diagnostics.recommendedAction} />
        <PulseTile icon="activity" label="Marcadores" value={`${diagnostics.scorePct}%`} text={`${diagnostics.missingScore} por cerrar`} />
        <PulseTile icon="star" label="Favoritos" value={String(favoritesCount)} text={favoritesCount ? 'Alertas personalizadas' : 'Agrega seguimiento'} />
        <PulseTile icon="sparkSmall" label="IA siguiente" value="1 acción" text={brief.nextAction} />
      </div>
    </section>
  );
}
