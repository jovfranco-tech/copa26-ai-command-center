import App from '../features/stadium/App';

export function Estadio3D() {
  return (
    <div className="stadium-feature-root" style={{ position: 'relative' }}>
      <div 
        style={{ 
          fontSize: '11px', 
          color: 'var(--tx-3)', 
          marginBottom: '12px',
          marginLeft: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span>Visualización no oficial de análisis deportivo. Sin afiliación oficial.</span>
      </div>
      <App />
    </div>
  );
}
