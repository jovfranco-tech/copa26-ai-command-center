import App from '../features/stadium/App';

export function Estadio3D() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        style={{ 
          fontSize: '11px', 
          color: 'var(--tx-3)', 
          marginBottom: '8px',
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
