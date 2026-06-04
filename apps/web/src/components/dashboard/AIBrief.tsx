import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@worldcup/ui';
import { useStats } from '@/hooks';
import { getBrowserAudioContext } from '@/lib/audioSynth';

export function AIBrief({ day, todayCount, liveCount }: { day: string; todayCount: number; liveCount: number }) {
  const navigate = useNavigate();
  const { data: stats } = useStats();
  const top = stats?.topScorers[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const playPodcastChime = () => {
    try {
      const ctx = getBrowserAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
      
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // AudioContext blocked
    }
  };

  const stopPodcast = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
  };

  const startPodcast = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setIsPlaying(true);
    playPodcastChime();

    const sentences = [
      "Bienvenidos al resumen narrado del Mundial.",
      `Hoy es el día destacado del torneo, ${day || 'de hoy'}. Contamos con ${todayCount} partidos de altísimo nivel programados.`,
      liveCount > 0 
        ? `Y ojo, ¡tenemos ${liveCount} partidos disputándose en vivo en este preciso instante en la cima!` 
        : "En este momento todos los equipos de la quiniela afinan sus estrategias.",
      top && top.goals > 0 
        ? `La bota de oro está que arde: ${top.name} lidera la tabla de artilleros con un espectacular registro de ${top.goals} goles. ¿Podrá alguien alcanzar su ritmo arrollador?` 
        : "",
      "¡Esto es todo por ahora! Sigue al tanto de tu quiniela y que gane el mejor estratega. ¡Hasta la próxima!"
    ].filter(Boolean);

    activeIndexRef.current = 0;
    utterancesRef.current = sentences.map((text) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-MX';
      u.rate = 1.0;
      u.pitch = 1.05;

      u.onend = () => {
        const nextIdx = activeIndexRef.current + 1;
        if (nextIdx < utterancesRef.current.length) {
          activeIndexRef.current = nextIdx;
          synthRef.current?.speak(utterancesRef.current[nextIdx]);
        } else {
          setIsPlaying(false);
        }
      };

      u.onerror = () => {
        setIsPlaying(false);
      };

      return u;
    });

    setTimeout(() => {
      if (utterancesRef.current.length > 0) {
        synthRef.current?.speak(utterancesRef.current[0]);
      }
    }, 450);
  };

  return (
    <div className="card brief">
      <div className="card-hd">
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--gold-soft)',
            color: 'var(--gold)',
          }}
        >
          <Icon name="calendar" size={15} />
        </span>
        <h3>Resumen del Día</h3>
        <span className="spacer" />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn ${isPlaying ? 'gold animate-pulse' : 'ghost'} btn-sm`}
            onClick={isPlaying ? stopPodcast : startPodcast}
            style={{ padding: '4px 10px', fontSize: 11.5 }}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={11} />
            {isPlaying ? 'Parar Resumen' : 'Resumen Narrado'}
          </button>
          <button type="button" className="btn ghost btn-sm" onClick={() => navigate({ to: '/analyst' })} style={{ padding: '4px 10px', fontSize: 11.5 }}>
            <Icon name="sparkSmall" size={13} /> Analista
          </button>
        </div>
      </div>
      <div className="card-pad brief-body">
        {isPlaying && (
          <div className="row gap-8 align-center animate-fade-in" style={{ background: 'rgba(201, 162, 75, 0.08)', border: '1px solid rgba(201,162,75,0.15)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 12 }}>
              <div style={{ width: 2, height: 8, background: 'var(--gold)', animation: 'pulse-briefing 0.7s infinite alternate' }} />
              <div style={{ width: 2, height: 12, background: 'var(--gold)', animation: 'pulse-briefing 0.5s infinite alternate 0.2s' }} />
              <div style={{ width: 2, height: 6, background: 'var(--gold)', animation: 'pulse-briefing 0.6s infinite alternate 0.4s' }} />
              <div style={{ width: 2, height: 10, background: 'var(--gold)', animation: 'pulse-briefing 0.8s infinite alternate 0.1s' }} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold-2)' }}>Transmitiendo resumen narrado...</span>
          </div>
        )}
        <div className="brief-pt">
          <span className="dot" />
          <span style={{ flex: 1 }}>
            Día destacado {day || '—'}: <span className="hl">{todayCount} partidos</span>
            {liveCount ? (
              <>
                , <span className="hl">{liveCount} en vivo</span> ahora
              </>
            ) : null}
            .
          </span>
        </div>
        {top && top.goals > 0 && (
          <div className="brief-pt">
            <span className="dot" />
            <span style={{ flex: 1 }}>
              <span className="hl">{top.name}</span> lidera el goleo con {top.goals} goles y {top.assists}{' '}
              asistencias.
            </span>
          </div>
        )}
        <div className="mono-label" style={{ marginTop: 10 }}>
          Generado automáticamente desde datos locales del torneo · haz clic en Resumen Narrado para escuchar el boletín vocal
        </div>
      </div>
    </div>
  );
}
