import { Suspense, lazy } from 'react';
import { useT } from '@/i18n';

const StadiumApp = lazy(() => import('../features/stadium/App'));

export function Estadio3D() {
  const t = useT();
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: '11px', color: 'var(--tx-3)', marginBottom: '8px', marginLeft: '4px' }}>
        {t('estadio3d.disclaimer')}
      </div>
      <Suspense fallback={<div className="page-fade" style={{ padding: 32, textAlign: 'center' }} role="status" aria-live="polite"><p className="muted">{t('estadio3d.loading')}</p></div>}>
        <div role="img" aria-label={t('estadio3d.ariaLabel')}>
          <StadiumApp />
        </div>
      </Suspense>
    </div>
  );
}
