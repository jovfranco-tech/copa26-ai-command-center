import { useMemo, useState, useRef } from 'react';
import { Icon } from '@worldcup/ui';
import { type Match as WorldCupMatch } from '@worldcup/shared';
import { notifyInfo } from '@/store/notifications';
import { useT } from '@/i18n';

export function HawkEyePitch({
  homeTeam,
  awayTeam,
  onSimulate,
  simulating,
}: {
  homeTeam: string;
  awayTeam: string;
  onSimulate: (report: string) => void;
  simulating: boolean;
}) {
  const t = useT();
  const [homePlayers, setHomePlayers] = useState(() => [
    { id: 'h1', role: t('asm.roleFwd'), x: 120, y: 80, label: t('asm.lblFwdCenter') },
    { id: 'h2', role: t('asm.roleMid'), x: 80, y: 150, label: t('asm.lblPlaymaker') },
    { id: 'h3', role: t('asm.roleDef'), x: 120, y: 220, label: t('asm.lblDefAnchor') },
  ]);
  const [awayPlayers, setAwayPlayers] = useState(() => [
    { id: 'a1', role: t('asm.roleFwd'), x: 120, y: 320, label: t('asm.lblFastStriker') },
    { id: 'a2', role: t('asm.roleMid'), x: 180, y: 250, label: t('asm.lblHolding') },
    { id: 'a3', role: t('asm.roleDef'), x: 120, y: 180, label: t('asm.lblSweeper') },
  ]);

  const [activePlayer, setActivePlayer] = useState<{ id: string; team: 'home' | 'away' } | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (id: string, team: 'home' | 'away') => {
    setActivePlayer({ id, team });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePlayer || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left));
    const y = Math.max(10, Math.min(rect.height - 10, e.clientY - rect.top));

    if (activePlayer.team === 'home') {
      setHomePlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? { ...p, x, y } : p)));
    } else {
      setAwayPlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? { ...p, x, y } : p)));
    }
  };

  const handlePointerUp = () => {
    setActivePlayer(null);
  };

  return (
    <div className="card card-pad animate-fade-in" style={{ background: 'rgba(10, 20, 12, 0.9)', border: '1px solid var(--gold-line)' }}>
      <h4 style={{ margin: '0 0 10px 0', color: 'var(--gold)' }}>{t('asm.hawkTitle')}</h4>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 14 }}>
        {t('asm.hawkDesc', { home: homeTeam || t('pool.pmHome'), away: awayTeam || t('pool.pmAway') })}
      </p>

      <div
        ref={pitchRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: '100%',
          height: 380,
          background: '#153a1a',
          backgroundImage: 'radial-gradient(#1f5326 30%, #153a1a 80%)',
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          touchAction: 'none',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 80,
              height: 80,
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 140,
              height: 60,
              border: '1px solid rgba(255,255,255,0.2)',
              borderTop: 'none',
              transform: 'translateX(-50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              width: 140,
              height: 60,
              border: '1px solid rgba(255,255,255,0.2)',
              borderBottom: 'none',
              transform: 'translateX(-50%)',
            }}
          />
        </div>

        {homePlayers.map((p) => (
          <div
            key={p.id}
            onPointerDown={() => handlePointerDown(p.id, 'home')}
            style={{
              position: 'absolute',
              left: p.x - 20,
              top: p.y - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c9a24b, #b38827)',
              color: '#000',
              fontWeight: 700,
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              cursor: 'grab',
              userSelect: 'none',
              border: '2px solid #fff',
              zIndex: activePlayer?.id === p.id ? 100 : 20,
              transition: activePlayer?.id === p.id ? 'none' : 'transform 0.1s ease',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
            title={p.label}
          >
            {p.role.slice(0, 3)}
          </div>
        ))}

        {awayPlayers.map((p) => (
          <div
            key={p.id}
            onPointerDown={() => handlePointerDown(p.id, 'away')}
            style={{
              position: 'absolute',
              left: p.x - 20,
              top: p.y - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #047857)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              cursor: 'grab',
              userSelect: 'none',
              border: '2px solid #fff',
              zIndex: activePlayer?.id === p.id ? 100 : 20,
              transition: activePlayer?.id === p.id ? 'none' : 'transform 0.1s ease',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
            title={p.label}
          >
            {p.role.slice(0, 3)}
          </div>
        ))}
      </div>

      <div className="row spread align-center" style={{ marginTop: 14 }}>
        <span className="mono-label" style={{ fontSize: 10.5 }}>{t('asm.config3v3')}</span>
        <button
          type="button"
          className="btn gold"
          style={{ padding: '6px 14px', fontSize: 12.5 }}
          onClick={() => {
            const report = t('asm.hawkReport', {
              home: homeTeam,
              away: awayTeam,
              hx: homePlayers[0].x,
              hy: homePlayers[0].y,
              ax: awayPlayers[2].x,
              ay: awayPlayers[2].y,
            });
            onSimulate(report);
            if ('vibrate' in navigator) navigator.vibrate([20, 40, 20]);
          }}
          disabled={simulating || !homeTeam || !awayTeam}
        >
          <Icon name={simulating ? 'sparkSmall' : 'ai'} size={13} />
          {simulating ? t('asm.computing') : t('asm.simulateClash')}
        </button>
      </div>
    </div>
  );
}

export function PressRoom({
  matchId,
  matches,
  onAnswer,
  answering,
}: {
  matchId: string;
  matches: WorldCupMatch[];
  onAnswer: (text: string) => void;
  answering: boolean;
}) {
  const t = useT();
  const [activeJournalist, setActiveJournalist] = useState<'jeanluc' | 'gary' | 'diego'>('jeanluc');
  const [userResponse, setUserResponse] = useState('');

  const selectedMatch = matches.find((m) => m.id === matchId) || matches[0];

  const questions = useMemo(() => {
    if (!selectedMatch) return { jeanluc: '', gary: '', diego: '' };
    const h = selectedMatch.home;
    const a = selectedMatch.away;
    return {
      jeanluc: t('asm.qJeanluc', { h, a }),
      gary: t('asm.qGary', { a }),
      diego: t('asm.qDiego', { h, a }),
    };
  }, [selectedMatch, t]);

  return (
    <div className="card card-pad animate-fade-in" style={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid var(--gold-line)' }}>
      <div className="row gap-8 align-center" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>🎙️</span>
        <h4 style={{ margin: 0, color: 'var(--gold)' }}>{t('asm.pressTitle')}</h4>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 16 }}>
        {t('asm.pressDesc', { match: selectedMatch ? `${selectedMatch.home} vs ${selectedMatch.away}` : t('asm.featured') })}
      </p>

      <div className="row gap-6" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`pill ${activeJournalist === 'jeanluc' ? 'on' : ''}`}
          onClick={() => setActiveJournalist('jeanluc')}
          style={{ fontSize: 11.5 }}
        >
          🇫🇷 Jean-Luc (L'Equipe)
        </button>
        <button
          type="button"
          className={`pill ${activeJournalist === 'gary' ? 'on' : ''}`}
          onClick={() => setActiveJournalist('gary')}
          style={{ fontSize: 11.5 }}
        >
          🇬🇧 Gary (The Athletic)
        </button>
        <button
          type="button"
          className={`pill ${activeJournalist === 'diego' ? 'on' : ''}`}
          onClick={() => setActiveJournalist('diego')}
          style={{ fontSize: 11.5 }}
        >
          🇦🇷 Diego (TyC Sports)
        </button>
      </div>

      <div
        className="row gap-12"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--gold-line)',
          borderRadius: 16,
          padding: '16px',
          marginBottom: 18,
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <img
            src={`/avatars/${activeJournalist}.png`}
            alt={
              activeJournalist === 'jeanluc'
                ? "Jean-Luc (L'Equipe)"
                : activeJournalist === 'gary'
                ? "Gary (The Athletic)"
                : "Diego (TyC Sports)"
            }
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--gold)',
              boxShadow: '0 0 10px rgba(201, 162, 75, 0.3)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              fontSize: 14,
              background: 'var(--bg-3)',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {activeJournalist === 'jeanluc' ? '🇫🇷' : activeJournalist === 'gary' ? '🇬🇧' : '🇦🇷'}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div className="mono-label" style={{ fontSize: 10, color: 'var(--gold-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeJournalist === 'jeanluc'
              ? "Jean-Luc · L'Equipe"
              : activeJournalist === 'gary'
              ? "Gary · The Athletic"
              : "Diego · TyC Sports"}
          </div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--tx-2)',
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            "{questions[activeJournalist]}"
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          className="searchbox"
          rows={3}
          style={{ width: '100%', height: 'auto', resize: 'none', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}
          placeholder={t('asm.pressPlaceholder')}
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
        />
        <div className="row spread align-center">
          <span className="mono-label" style={{ fontSize: 10 }}>{t('asm.pressFilter')}</span>
          <button
            type="button"
            className="btn gold"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
            onClick={() => {
              if (!userResponse.trim()) {
                notifyInfo(t('asm.emptyField'), t('asm.emptyFieldText'));
                return;
              }
              const score = Math.floor(Math.random() * 20) + 80;
              const reporterName = activeJournalist === 'jeanluc' ? "Jean-Luc (L'Equipe)" : activeJournalist === 'gary' ? "Gary (The Athletic)" : "Diego (TyC Sports)";
              const feedback = t('asm.pressFeedback', { reporter: reporterName, response: userResponse, score });
              onAnswer(feedback);
              setUserResponse('');
              if ('vibrate' in navigator) navigator.vibrate([30, 10, 30]);
            }}
            disabled={answering}
          >
            {t('asm.respondPress')}
          </button>
        </div>
      </div>
    </div>
  );
}
