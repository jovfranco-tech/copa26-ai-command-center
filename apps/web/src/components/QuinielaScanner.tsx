import { useEffect, useRef, useState } from 'react';
import { Icon } from '@worldcup/ui';
import { scanPoolPaper } from '@/lib/api';

interface ScannerProps {
  onClose: () => void;
  onScanSuccess: (predictions: Record<string, { homeGoals: number; awayGoals: number; outcome: 'home' | 'draw' | 'away' }>) => void;
  matches: Array<{ id: string; home: string; away: string; homeName: string; awayName: string }>;
}

export function QuinielaScanner({ onClose, onScanSuccess, matches }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('No se pudo acceder a la cámara. Asegúrate de otorgar permisos de cámara en tu navegador.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureAndProcess = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setScanning(true);
    setError(null);

    // Set canvas dimensions to match video frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas image to base64 PNG
    const base64Data = canvas.toDataURL('image/png').split(',')[1];
    if (!base64Data) {
      setError('Error al capturar la imagen de la quiniela.');
      setScanning(false);
      return;
    }

    try {
      const res = await scanPoolPaper(base64Data, matches);
      if (res.ok && res.predictions && Object.keys(res.predictions).length > 0) {
        onScanSuccess(res.predictions);
        if ('vibrate' in navigator) navigator.vibrate([10, 30, 10]);
        alert(`¡Quiniela procesada con éxito! Se cargaron marcadores para ${Object.keys(res.predictions).length} partidos.`);
        onClose();
      } else {
        setError(res.reason === 'no-key' 
          ? 'No se ha configurado la API Key de Gemini en tu cuenta.' 
          : 'No se pudieron reconocer marcadores legibles en la foto. Intenta alinear mejor la hoja.');
      }
    } catch (err) {
      console.error('OCR Processing error:', err);
      setError('Ocurrió un error al procesar el escaneo táctico.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card holographic-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'rgba(15, 15, 15, 0.9)',
          border: '1px solid var(--gold-line)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="card-hd" style={{ borderBottom: '1px solid var(--line)', padding: '16px 20px' }}>
          <Icon name="camera" size={16} style={{ color: 'var(--gold)' }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Escanear Quiniela en Papel</h3>
          <span className="spacer" />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: 4,
            }}
            disabled={scanning}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="card-pad" style={{ padding: 20, position: 'relative' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 12,
                color: '#f87171',
                padding: '10px 14px',
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* Camera Frame Viewport */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 280,
              background: '#000',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p className="muted" style={{ fontSize: 12.5 }}>Iniciando cámara táctica…</p>
              </div>
            )}

            {/* Target Alignment Overlay Grid */}
            <div
              style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                right: '10%',
                bottom: '10%',
                border: '2px dashed var(--gold)',
                borderRadius: 8,
                pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  color: 'rgba(201, 162, 75, 0.5)',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
              >
                Alinea tu quiniela de papel aquí
              </div>
            </div>
          </div>

          <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            Posiciona la cámara de forma que los nombres de las selecciones y tus marcadores manuscritos queden centrados y bien iluminados en la cuadrícula dorada.
          </p>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Footer Actions */}
        <div
          className="row gap-10"
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--line)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            type="button"
            className="btn ghost"
            style={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
            onClick={onClose}
            disabled={scanning}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn gold"
            style={{ flex: 2 }}
            onClick={captureAndProcess}
            disabled={!stream || scanning}
          >
            <Icon name={scanning ? 'sparkSmall' : 'camera'} size={15} />
            {scanning ? 'Procesando Quiniela (IA)…' : 'Escanear Quiniela'}
          </button>
        </div>
      </div>
    </div>
  );
}
