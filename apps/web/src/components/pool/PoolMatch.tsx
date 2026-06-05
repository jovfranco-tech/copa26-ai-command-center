import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@worldcup/ui';
import { fmtDay, type Match } from '@worldcup/shared';
import { TeamCrest } from '@/components/identity';
import { usePool, type PoolOutcome } from '@/store/pool';
import { isMatchLocked, lockLabel } from '@/lib/matchMeta';
import { shareTextCard } from '@/lib/shareCards';
import { getBrowserAudioContext } from '@/lib/audioSynth';
import { notifyInfo } from '@/store/notifications';
import { useT, useLang } from '@/i18n';

const playTick = () => {
  try {
    const ctx = getBrowserAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // AudioContext blocked
  }
};

const OUTCOMES: Array<{ id: PoolOutcome; key: string }> = [
  { id: 'home', key: 'pool.pmHome' },
  { id: 'draw', key: 'matchdayHero.draw' },
  { id: 'away', key: 'pool.pmAway' },
];

export function PoolMatch({ match, homeName, awayName }: { match: Match; homeName: string; awayName: string }) {
  const t = useT();
  const lang = useLang();
  const pick = usePool((s) => s.picks[match.id]);
  const setOutcome = usePool((s) => s.setOutcome);
  const setScore = usePool((s) => s.setScore);
  const clearMatch = usePool((s) => s.clearMatch);

  const isLocked = match.status !== 'UPCOMING' || isMatchLocked(match);

  const [isPlayingBrief, setIsPlayingBrief] = useState(false);

  const tacticalBriefingText = useMemo(() => {
    let text = t('pool.pmBriefIntro', { home: homeName, away: awayName });
    const textOptions = [t('pool.pmBriefText1'), t('pool.pmBriefText2'), t('pool.pmBriefText3')];
    const hash = match.id.charCodeAt(0) + (match.id.charCodeAt(1) || 0);
    text += textOptions[hash % textOptions.length] + ' ';
    const ragOptions = [t('pool.pmBriefRag1'), t('pool.pmBriefRag2'), t('pool.pmBriefRag3')];
    text += ragOptions[hash % ragOptions.length] + ' ';
    text += t('pool.pmBriefOutro');
    return text;
  }, [homeName, awayName, match.id, t]);

  useEffect(() => {
    return () => {
      if (isPlayingBrief) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlayingBrief]);

  const togglePlayBriefing = () => {
    if (isPlayingBrief) {
      window.speechSynthesis.cancel();
      setIsPlayingBrief(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(tacticalBriefingText);
      utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) => v.lang.startsWith(lang));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.onend = () => setIsPlayingBrief(false);
      utterance.onerror = () => setIsPlayingBrief(false);
      setIsPlayingBrief(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const scoreValue = (v: number | undefined) => (v == null ? '' : String(v));
  const parseScore = (value: string) => {
    if (value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(30, Math.round(n))) : undefined;
  };

  const outcome = pick?.outcome;
  const homeGoals = pick?.homeGoals;
  const awayGoals = pick?.awayGoals;

  const pointsInfo = useMemo(() => {
    if (!isLocked || !outcome) return null;
    const realHome = match.homeGoals ?? 0;
    const realAway = match.awayGoals ?? 0;

    let realOutcome: 'home' | 'draw' | 'away' = 'draw';
    if (realHome > realAway) realOutcome = 'home';
    else if (realHome < realAway) realOutcome = 'away';

    const isExact = homeGoals === realHome && awayGoals === realAway;
    const isOutcomeCorrect = outcome === realOutcome;

    if (isExact) {
      return { text: '+3 PTS', className: 'gold-badge', label: t('pool.pmExactScore'), icon: 'trophy' };
    } else if (isOutcomeCorrect) {
      return { text: '+1 PT', className: 'green-badge', label: t('pool.pmCorrectResult'), icon: 'check' };
    } else {
      return { text: '0 PTS', className: 'gray-badge', label: t('pool.pmWrongPrediction'), icon: 'close' };
    }
  }, [isLocked, outcome, homeGoals, awayGoals, match.homeGoals, match.awayGoals, t]);

  const sharePrediction = async () => {
    if (!outcome || homeGoals == null || awayGoals == null) {
      notifyInfo(t('pool.pickIncomplete'), t('pool.pmShareIncomplete'));
      return;
    }
    await shareTextCard({
      title: `${homeName} ${homeGoals} - ${awayGoals} ${awayName}`,
      subtitle: `${t('pool.pmMyPrediction')} · ${fmtDay(match.date)} ${match.time}`,
      lines: [
        t('pool.pmMatchLine', { home: homeName, away: awayName }),
        t('pool.pmChosenResult', { result: t(OUTCOMES.find((o) => o.id === outcome)?.key ?? 'pool.noWinner') }),
        t('pool.pmScoreLine', { score: `${homeGoals}-${awayGoals}` }),
        lockLabel(match, t),
      ],
      footer: t('pool.footerPool2026'),
      fileName: `prediccion-${match.id}.png`,
    });
  };

  return (
    <div className={`card pool-match${isLocked ? ' is-locked' : ''}`}>
      <div className="pool-match-head">
        {match.status === 'LIVE' ? (
          <span className="pool-match-status-pill live">{t('matchCenter.live')}</span>
        ) : isLocked ? (
          <span className="pool-match-status-pill ft">{t('matchdayHero.finished')}</span>
        ) : (
          <span className="badge up">{match.time}</span>
        )}
        <span className="mono-label">{fmtDay(match.date)}</span>

        {!isLocked && (
          <button
            type="button"
            className="fav-btn"
            style={{
              marginRight: 6,
              color: isPlayingBrief ? 'var(--gold)' : 'var(--tx-3)',
              animation: isPlayingBrief ? 'pulse-briefing 1s infinite alternate' : 'none',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={togglePlayBriefing}
            title={isPlayingBrief ? t('pool.pmStopBrief') : t('pool.pmPlayBrief')}
            aria-label={t('pool.pmTacticalMinute')}
          >
            <Icon name={isPlayingBrief ? "sparkSmall" : "ai"} size={14} />
          </button>
        )}
        {pointsInfo ? (
          <span className={`badge-points ${pointsInfo.className}`} title={pointsInfo.label}>
            <Icon name={pointsInfo.icon} size={11} />
            {pointsInfo.text}
          </span>
        ) : !isLocked ? (
          <span className="row gap-6" style={{ marginLeft: 'auto' }}>
            <button type="button" className="fav-btn" onClick={sharePrediction} aria-label={t('pool.pmSharePredictionAria')} title={t('pool.pmSharePredictionAria')}>
              <Icon name="share" size={14} />
            </button>
            <button type="button" className="fav-btn" onClick={() => clearMatch(match.id)} aria-label={t('pool.pmClearMatch')}>
              <Icon name="close" size={14} />
            </button>
          </span>
        ) : null}
      </div>
      <div className="pool-teams">
        <TeamCrest code={match.home} size={34} />
        <div>
          <strong>{homeName}</strong>
          <span className="mono-label">{match.home}</span>
        </div>
        <span className="pool-vs">vs</span>
        <div className="pool-away">
          <strong>{awayName}</strong>
          <span className="mono-label">{match.away}</span>
        </div>
        <TeamCrest code={match.away} size={34} />
      </div>
      <div className="pool-picks" role="group" aria-label={t('pool.pmPredictionAria', { home: homeName, away: awayName })}>
        {OUTCOMES.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`pool-pick${outcome === o.id ? ' on' : ''}`}
            onClick={() => {
              setOutcome(match.id, o.id);
              playTick();
              if ('vibrate' in navigator) navigator.vibrate(10);
            }}
            disabled={isLocked}
          >
            {t(o.key)}
          </button>
        ))}
      </div>
      <div className="pool-score">
        <label>
          <span className="mono-label">{match.home}</span>
          <input
            inputMode="numeric"
            value={scoreValue(homeGoals)}
            onChange={(e) => {
              setScore(match.id, 'homeGoals', parseScore(e.target.value));
              playTick();
              if ('vibrate' in navigator) navigator.vibrate(6);
            }}
            aria-label={t('pool.pmGoalsAria', { team: homeName })}
            disabled={isLocked}
          />
        </label>
        <span className="mono-label">{t('pool.pmPredicted')}</span>
        <label>
          <span className="mono-label">{match.away}</span>
          <input
            inputMode="numeric"
            value={scoreValue(awayGoals)}
            onChange={(e) => {
              setScore(match.id, 'awayGoals', parseScore(e.target.value));
              playTick();
              if ('vibrate' in navigator) navigator.vibrate(6);
            }}
            aria-label={t('pool.pmGoalsAria', { team: awayName })}
            disabled={isLocked}
          />
        </label>
      </div>

      <div className="pool-lock-note">
        <Icon name={isLocked ? 'shield' : 'clock'} size={12} />
        {lockLabel(match, t)}
      </div>

      {isLocked && (
        <div className="pool-match-real-score">
          <span>{t('pool.pmRealResult')}</span>
          <strong>{match.homeGoals ?? 0} - {match.awayGoals ?? 0}</strong>
        </div>
      )}
    </div>
  );
}
