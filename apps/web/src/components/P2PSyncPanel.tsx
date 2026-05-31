import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';
import { Icon } from '@worldcup/ui';

interface P2PSyncPanelProps {
  playerName: string;
  picks: Record<string, any>;
  onSyncComplete: (peerName: string, peerPicks: any) => void;
}

export function P2PSyncPanel({ playerName, picks, onSyncComplete }: P2PSyncPanelProps) {
  const [mode, setMode] = useState<'idle' | 'host' | 'join' | 'syncing' | 'success' | 'error'>('idle');
  const [hostCode, setHostCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [peerName, setPeerName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Clean up Firestore listener on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const playHaptic = (pattern: number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Generate 4-digit code and become the Host
  const startHosting = async () => {
    if (!playerName.trim()) {
      alert('Por favor ingresa tu nombre de participante antes de sincronizar.');
      return;
    }
    
    setMode('syncing');
    setStatusMessage('Generando canal de sincronización seguro...');
    playHaptic([20]);

    // Generate random 4 digit code
    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    setHostCode(generatedCode);

    try {
      const docRef = doc(db, 'rtcSyncSessions', generatedCode);
      await setDoc(docRef, {
        hostName: playerName,
        hostPicks: picks,
        status: 'waiting',
        createdAt: new Date().toISOString(),
      });

      setMode('host');
      setStatusMessage('Escaneando en busca de rivales locales...');

      // Listen for peer connection
      unsubscribeRef.current = onSnapshot(docRef, async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        if (data.status === 'connected' && data.clientName) {
          setMode('syncing');
          setStatusMessage(`¡Enlace establecido! Sincronizando picks con ${data.clientName}...`);
          playHaptic([40, 20, 40]);
          
          // Wait briefly for smooth animation feel
          setTimeout(async () => {
            setPeerName(data.clientName);
            onSyncComplete(data.clientName, data.clientPicks);
            setMode('success');
            playHaptic([100, 50, 100]);

            // Clean up session document
            try {
              await deleteDoc(docRef);
            } catch (e) {
              console.warn('Could not delete sync doc', e);
            }
          }, 1500);
        }
      });
    } catch (err) {
      console.error(err);
      setMode('error');
      setStatusMessage('Error al iniciar el canal local. Intenta nuevamente.');
    }
  };

  // Join an existing host session using 4 digit code
  const joinSession = async () => {
    if (!playerName.trim()) {
      alert('Por favor ingresa tu nombre de participante antes de sincronizar.');
      return;
    }
    if (!inputCode.trim() || inputCode.length !== 4) {
      alert('Ingresa un código de 4 dígitos válido.');
      return;
    }

    setMode('syncing');
    setStatusMessage('Buscando señal de sincronización local...');
    playHaptic([20]);

    try {
      const docRef = doc(db, 'rtcSyncSessions', inputCode);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        playHaptic([100]);
        setMode('error');
        setStatusMessage('Código incorrecto o canal expirado. Verifica el código e intenta.');
        return;
      }

      const data = docSnap.data();
      if (data.status !== 'waiting') {
        setMode('error');
        setStatusMessage('Este canal ya está ocupado por otra sincronización.');
        return;
      }

      setPeerName(data.hostName);

      // Write client picks to signal connection
      await setDoc(docRef, {
        ...data,
        clientName: playerName,
        clientPicks: picks,
        status: 'connected',
      });

      setStatusMessage(`¡Conectado con ${data.hostName}! Intercambiando datos tácticos...`);
      playHaptic([40, 20, 40]);

      setTimeout(() => {
        onSyncComplete(data.hostName, data.hostPicks);
        setMode('success');
        playHaptic([100, 50, 100]);
      }, 1500);

    } catch (err) {
      console.error(err);
      setMode('error');
      setStatusMessage('Error al unirse a la sesión táctica.');
    }
  };

  const resetPanel = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setMode('idle');
    setHostCode('');
    setInputCode('');
    setPeerName('');
    setStatusMessage('');
  };

  return (
    <div
      className="card card-pad animate-fade-in"
      style={{
        background: 'rgba(18, 18, 24, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--gold-line)',
        borderRadius: 16,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Absolute subtle background radar pulses in Host/Sync modes */}
      {(mode === 'host' || mode === 'syncing') && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 300, zIndex: 0, pointerEvents: 'none' }}>
          <div className="radar-pulse" />
          <div className="radar-pulse" style={{ animationDelay: '1s' }} />
          <div className="radar-pulse" style={{ animationDelay: '2s' }} />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="row gap-8 align-center" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>📶</span>
          <h4 style={{ margin: 0, color: 'var(--gold)' }}>Sincronización familiar por código</h4>
        </div>

        {mode === 'idle' && (
          <div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 16 }}>
              Intercambia tus quinielas y compite al instante con familiares o amigos usando un canal temporal en Firestore.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                className="btn gold"
                onClick={startHosting}
                style={{ padding: '10px', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}
              >
                <Icon name="swap" size={16} />
                <span style={{ fontWeight: 700 }}>Ser Anfitrión</span>
                <span className="muted" style={{ fontSize: 9.5, textTransform: 'none', fontWeight: 400 }}>Genera un código</span>
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setMode('join')}
                style={{ padding: '10px', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', borderColor: 'var(--gold-line)' }}
              >
                <Icon name="pin" size={16} />
                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>Unirse a Canal</span>
                <span className="muted" style={{ fontSize: 9.5, textTransform: 'none', fontWeight: 400 }}>Ingresa código de amigo</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'host' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 12px 0' }}>
              Comparte este código con tu compañero para iniciar la sincronización:
            </p>
            <div
              className="tx-gold"
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: 8,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed var(--gold-line)',
                borderRadius: 12,
                padding: '8px 12px',
                display: 'inline-block',
                fontFamily: 'monospace',
                margin: '8px 0 16px 0',
              }}
            >
              {hostCode}
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 0 }}>
              <span className="live-dot" /> {statusMessage}
            </p>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={resetPanel}
              style={{ marginTop: 16, fontSize: 11, padding: '4px 12px' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 14 }}>
              Ingresa el código de 4 dígitos generado en la pantalla de tu amigo o familiar:
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="text"
                maxLength={4}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Código (Ej. 4892)"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 4,
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                className="btn gold"
                onClick={joinSession}
                disabled={inputCode.length !== 4}
                style={{ padding: '0 20px' }}
              >
                Conectar
              </button>
            </div>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={resetPanel}
              style={{ fontSize: 11, width: '100%' }}
            >
              Volver
            </button>
          </div>
        )}

        {mode === 'syncing' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'inline-block', width: 42, height: 42, border: '3px solid rgba(201,162,75,0.2)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--gold-2)' }}>
              {statusMessage}
            </p>
          </div>
        )}

        {mode === 'success' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid #10b981', color: '#10b981', fontSize: 20, marginBottom: 10 }}>
              ✓
            </div>
            <h5 style={{ margin: '0 0 4px 0', fontSize: 15, color: '#10b981' }}>¡Sincronización Completa!</h5>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 16px 0' }}>
              Los pronósticos de <strong>{peerName}</strong> se han sincronizado en tu cartelera táctica local.
            </p>
            <button
              type="button"
              className="btn gold"
              onClick={resetPanel}
              style={{ padding: '6px 20px', fontSize: 12 }}
            >
              Entendido
            </button>
          </div>
        )}

        {mode === 'error' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', color: '#ef4444', fontSize: 18, marginBottom: 10 }}>
              ✕
            </div>
            <h5 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#ef4444' }}>Error de Enlace</h5>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 16px 0' }}>
              {statusMessage}
            </p>
            <button
              type="button"
              className="btn ghost"
              onClick={resetPanel}
              style={{ padding: '6px 20px', fontSize: 12, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
