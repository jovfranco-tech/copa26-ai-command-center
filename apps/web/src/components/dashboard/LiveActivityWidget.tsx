import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@worldcup/ui';
import { TeamCrest } from '@/components/identity';
import { useHolographicTilt } from '@/hooks';
import { useT } from '@/i18n';
import { stadiumAudio } from '@/lib/audioSynth';

export function LiveActivityWidget() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [minute, setMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [goalFlash, setGoalFlash] = useState(false);
  const [lastScorer, setLastScorer] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const tRef = useRef(t);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useHolographicTilt(containerRef);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setMinute((prev) => {
          if (prev >= 90) {
            setIsRunning(false);
            if (interval) clearInterval(interval);
            return 90;
          }
          const nextMin = prev + 1;
          
          const MEX_CHANCE = 0.025;
          const ARG_CHANCE = 0.020;
          const rand = Math.random();
          
          if (rand < MEX_CHANCE) {
            setHomeScore((s) => s + 1);
            setGoalFlash(true);
            setTimeout(() => setGoalFlash(false), 1200);
            const scorers = ['Santi Giménez', 'Chucky Lozano', 'Edson Álvarez', 'Luis Chávez'];
            const scorer = scorers[Math.floor(Math.random() * scorers.length)];
            setLastScorer(tRef.current('liveWidget.goalMexico', { scorer, min: nextMin }));
            if (soundEnabledRef.current) {
              stadiumAudio.triggerGoalSequence('home');
            }
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
          } else if (rand < MEX_CHANCE + ARG_CHANCE) {
            setAwayScore((s) => s + 1);
            setGoalFlash(true);
            setTimeout(() => setGoalFlash(false), 1200);
            const scorers = ['Leo Messi', 'Lautaro Martínez', 'Julián Álvarez', 'Enzo Fernández'];
            const scorer = scorers[Math.floor(Math.random() * scorers.length)];
            setLastScorer(tRef.current('liveWidget.goalArgentina', { scorer, min: nextMin }));
            if (soundEnabledRef.current) {
              stadiumAudio.triggerGoalSequence('away');
            }
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
          }
          
          return nextMin;
        });
      }, 350);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const resetSimulation = () => {
    setIsRunning(false);
    setMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setGoalFlash(false);
    setLastScorer('');
    if ('vibrate' in navigator) navigator.vibrate([15]);
  };

  const getLivePoints = (predHome: number, predAway: number, actualHome: number, actualAway: number): number => {
    const predOutcome = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const actualOutcome = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
    if (predHome === actualHome && predAway === actualAway) return 3;
    if (predOutcome === actualOutcome) return 1;
    return 0;
  };

  const liveLeaderboard = useMemo(() => {
    const aiPrefix = t('stats.aiPrefix');
    const players = [
      { name: t('liveWidget.youName'), pickHome: 2, pickAway: 1, isUser: true },
      { name: `${aiPrefix} · ${t('stats.agentOptimist')}`, pickHome: 3, pickAway: 1, isUser: false },
      { name: `${aiPrefix} · ${t('stats.agentStatistician')}`, pickHome: 1, pickAway: 1, isUser: false },
      { name: `${aiPrefix} · ${t('stats.agentContrarian')}`, pickHome: 0, pickAway: 2, isUser: false },
    ];

    const mapped = players.map((p) => {
      const pts = getLivePoints(p.pickHome, p.pickAway, homeScore, awayScore);
      return {
        ...p,
        pts,
        pickStr: `${p.pickHome}-${p.pickAway}`,
      };
    });

    return mapped.sort((a, b) => b.pts - a.pts);
  }, [homeScore, awayScore, t]);

  return (
    <div ref={containerRef} className={`live-activity-card holographic-card ${goalFlash ? 'goal-flash' : ''}`} style={{ marginBottom: 16 }}>
      {/* Header */}
      <div className="row spread align-center" style={{ marginBottom: 12 }}>
        <div className="row gap-6 align-center">
          <span className="live-badge">{t('liveWidget.liveActivity')}</span>
          <span className="mono-label" style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}>Lock Screen</span>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if ('vibrate' in navigator) navigator.vibrate([10]);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: soundEnabled ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease',
            }}
            title={soundEnabled ? t('liveWidget.soundOff') : t('liveWidget.soundOn')}
          >
            <Icon name={soundEnabled ? 'volume' : 'mute'} size={13} />
          </button>
        </div>
        <div className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
          {minute === 90 ? t('liveWidget.end') : minute > 0 ? `${minute}'` : '0\''}
        </div>
      </div>

      {/* Main Score UI */}
      <div className="row spread align-center" style={{ padding: '8px 4px' }}>
        {/* Home Team */}
        <div className="la-crest-container">
          <TeamCrest code="MEX" size={32} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>MEX</span>
        </div>

        {/* Score */}
        <div className="row gap-12 align-center">
          <span className="la-score">{homeScore}</span>
          <span className="la-score-divider">:</span>
          <span className="la-score">{awayScore}</span>
        </div>

        {/* Away Team */}
        <div className="la-crest-container">
          <TeamCrest code="ARG" size={32} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>ARG</span>
        </div>
      </div>

      {/* Scorer Alerts */}
      {lastScorer && (
        <div
          className="animate-fade-in"
          style={{
            background: 'rgba(201, 162, 75, 0.1)',
            border: '1px solid rgba(201, 162, 75, 0.2)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            color: 'var(--gold-2)',
            textAlign: 'center',
            marginTop: 8,
            fontWeight: 600,
          }}
        >
          {lastScorer}
        </div>
      )}

      {/* Progress Timeline */}
      <div className="la-timeline-track">
        <div className="la-timeline-fill" style={{ width: `${(minute / 90) * 100}%` }} />
      </div>

      {/* Live Leaderboard Podium Inside Widget */}
      <div style={{ marginTop: 12 }}>
        <div className="mono-label" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {t('liveWidget.liveQuiniela')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {liveLeaderboard.map((u, i) => (
            <div key={u.name} className={`la-podium-row ${u.isUser ? 'user' : ''}`}>
              <div className="row gap-6 align-center">
                <span className="num muted" style={{ width: 12 }}>{i + 1}</span>
                <span style={{ fontWeight: u.isUser ? 700 : 500 }}>{u.name}</span>
                <span className="muted" style={{ fontSize: 10 }}>({u.pickStr})</span>
              </div>
              <span className="num tx-gold" style={{ fontWeight: 800 }}>
                {u.pts} {u.pts === 1 ? 'pt' : 'pts'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="row gap-8" style={{ marginTop: 14 }}>
        <button
          type="button"
          className={`btn btn-sm ${isRunning ? 'ghost' : 'gold'}`}
          style={{ flex: 1, fontSize: 11, height: 28 }}
          onClick={() => {
            setIsRunning(!isRunning);
            if ('vibrate' in navigator) navigator.vibrate([10]);
          }}
        >
          <Icon name={isRunning ? 'pause' : 'play'} size={11} />
          {isRunning ? t('liveWidget.pause') : minute > 0 && minute < 90 ? t('liveWidget.resume') : t('liveWidget.simulate')}
        </button>

        {(minute > 0 || isRunning) && (
          <button
            type="button"
            className="btn ghost btn-sm"
            style={{ fontSize: 11, height: 28, padding: '0 10px', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            onClick={resetSimulation}
          >
            <Icon name="close" size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
