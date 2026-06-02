import App from '../features/stadium/App';

export function Estadio3D() {
  return (
    <div className="stadium-feature-root" style={{ position: 'relative' }}>
      <div 
        style={{ 
          fontSize: '11px', 
          color: 'var(--tx-3)', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--line)', 
          borderRadius: '8px', 
          padding: '8px 12px', 
          marginBottom: '16px',
          lineHeight: '1.4'
        }}
      >
        ⚠️ <strong>Aviso de exención de responsabilidad:</strong> Prototipo privado no oficial de análisis deportivo. No está afiliado a FIFA, organizadores del torneo, selecciones ni sedes oficiales.
      </div>
      <App />
    </div>
  );
}
