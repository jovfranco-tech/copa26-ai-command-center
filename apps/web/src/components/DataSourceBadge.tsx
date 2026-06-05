import { Icon } from '@worldcup/ui';
import { useT } from '@/i18n';

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
  const t = useT();
  const tone = confidence === 'Alta' ? 'ok' : confidence === 'Media' ? 'warn' : 'muted';
  const confLabel =
    confidence === 'Alta'
      ? t('sourceBadge.high')
      : confidence === 'Media'
        ? t('sourceBadge.medium')
        : confidence === 'Manual'
          ? t('sourceBadge.manual')
          : t('sourceBadge.pending');
  return (
    <span
      className={`source-badge ${tone}${compact ? ' compact' : ''}`}
      title={`${label} · ${t('sourceBadge.sourceLabel')}: ${source} · ${t('sourceBadge.dateLabel')}: ${date} · ${t('sourceBadge.confidenceLabel')}: ${confLabel}`}
    >
      <Icon name={confidence === 'Alta' ? 'shield' : confidence === 'Media' ? 'info' : 'clock'} size={compact ? 11 : 13} />
      <span>{compact ? confLabel : label}</span>
    </span>
  );
}
