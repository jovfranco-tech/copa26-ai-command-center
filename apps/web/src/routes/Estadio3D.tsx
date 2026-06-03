import { Suspense, lazy } from 'react';

const StadiumApp = lazy(() => import('../features/stadium/App'));

export function Estadio3D() {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: '11px', color: 'var(--tx-3)', marginBottom: '8px', marginLeft: '4px' }}>
        Visualización no oficial de análisis deportivo. Sin afiliación oficial.
      </div>
      <Suspense fallback={<div className="page-fade" style={{ padding: 32, textAlign: 'center' }}><p className="muted">Cargando estadio 3D...</p></div>}>
        <StadiumApp />
      </Suspense>
    </div>
  );
}
