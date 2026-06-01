import { Icon } from '@worldcup/ui';

export function DataSourceBadge({
  label,
  source,
  date,
  confidence,
  compact = false,
}: {
  label: string;
  source: string;
  date: string;
  confidence: 'Alta' | 'Media' | 'Pendiente' | 'Manual';
  compact?: boolean;
}) {
  const tone = confidence === 'Alta' ? 'ok' : confidence === 'Media' ? 'warn' : 'muted';
  return (
    <span
      className={`source-badge ${tone}${compact ? ' compact' : ''}`}
      title={`${label} · Fuente: ${source} · Fecha: ${date} · Confianza: ${confidence}`}
    >
      <Icon name={confidence === 'Alta' ? 'shield' : confidence === 'Media' ? 'info' : 'clock'} size={compact ? 11 : 13} />
      <span>{compact ? confidence : label}</span>
    </span>
  );
}

