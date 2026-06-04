import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@worldcup/ui';
import type { Match } from '@worldcup/shared';
import { useTeamsMap } from '@/hooks';
import { shareTextCard } from '@/lib/shareCards';

export function FamilyLaunchPanel({ match }: { match: Match | null }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const [sharing, setSharing] = useState(false);

  const shareMatchday = async () => {
    if (!match) return;
    setSharing(true);
    try {
      await shareTextCard({
        title: 'Partido del día',
        subtitle: `${teams[match.home]?.name ?? match.home} vs ${teams[match.away]?.name ?? match.away}`,
        lines: [
          `Fecha: ${match.date} ${match.time}`,
          `Sede: ${match.venue}`,
          'Acceso directo a quiniela, modo TV y centro de datos.',
        ],
        footer: 'Mundial 2026',
        fileName: `partido-del-dia-${match.id}.png`,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="matchday-launch-strip card">
      <div>
        <span className="mono-label">Accesos del día</span>
        <strong>De la previa a la quiniela en un toque</strong>
      </div>
      <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
        <Icon name="trophy" size={15} /> Quiniela
      </button>
      <button type="button" className="btn ghost" onClick={() => navigate({ to: '/tv' })}>
        <Icon name="present" size={15} /> Pantalla grande
      </button>
      <button type="button" className="btn ghost" onClick={() => navigate({ to: '/data' })}>
        <Icon name="database" size={15} /> Estado de datos
      </button>
      <button type="button" className="btn ghost" onClick={shareMatchday} disabled={!match || sharing}>
        <Icon name="share" size={15} /> {sharing ? 'Creando...' : 'Compartir'}
      </button>
    </div>
  );
}
