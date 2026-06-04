import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@worldcup/ui';
import { fmtDay, type Match } from '@worldcup/shared';
import { TeamCrest } from '@/components/identity';
import { usePool, type PoolOutcome } from '@/store/pool';
import { isMatchLocked, lockLabel } from '@/lib/matchMeta';
import { shareTextCard } from '@/lib/shareCards';
import { getBrowserAudioContext } from '@/lib/audioSynth';
import { notifyInfo } from '@/store/notifications';

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

const OUTCOMES: Array<{ id: PoolOutcome; label: string }> = [
  { id: 'home', label: 'Local' },
  { id: 'draw', label: 'Empate' },
  { id: 'away', label: 'Visita' },
];

export function PoolMatch({ match, homeName, awayName }: { match: Match; homeName: string; awayName: string }) {
  const pick = usePool((s) => s.picks[match.id]);
  const setOutcome = usePool((s) => s.setOutcome);
  const setScore = usePool((s) => s.setScore);
  const clearMatch = usePool((s) => s.clearMatch);

  const isLocked = match.status !== 'UPCOMING' || isMatchLocked(match);

  const [isPlayingBrief, setIsPlayingBrief] = useState(false);

  const tacticalBriefingText = useMemo(() => {
    let text = `Bienvenidos a El Minuto Táctico. Se enfrentan las selecciones de ${homeName} y ${awayName}. `;
    const textOptions = [
      `La pizarra táctica sugiere un duelo sumamente equilibrado en el mediocampo, donde la posesión y las transiciones rápidas por las bandas serán determinantes para inclinar la balanza.`,
      `El analista deportivo de gala destaca que la solidez defensiva del conjunto visitante pondrá a prueba la creatividad e intensidad del ataque de los locales.`,
      `Las alertas de tendencias indican una alta probabilidad de contragolpes de gala y jugadas a balón parado que podrían romper la paridad en cualquier minuto.`
    ];
    const hash = match.id.charCodeAt(0) + (match.id.charCodeAt(1) || 0);
    text += textOptions[hash % textOptions.length] + " ";
    const ragOptions = [
      `Atención: los últimos reportes deportivos reportan un clima severo lluvioso en la sede del encuentro, lo que beneficiará el juego de pases rasos rápidos.`,
      `Reportes de scouts señalan que la posible baja por acumulación de tarjetas en la defensa obligará a replantear el parado táctico inicial.`,
      `El inyector RAG deportivo destaca que la motivación es máxima y se espera una asistencia récord que jugará un rol psicológico clave.`
    ];
    text += ragOptions[hash % ragOptions.length] + " ";
    text += `¿Qué resultado colocarás en tu quiniela premium de gala?`;
    return text;
  }, [homeName, awayName, match.id]);

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
      utterance.lang = 'es-ES';
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
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
      return { text: '+3 PTS', className: 'gold-badge', label: 'Marcador Exacto', icon: 'trophy' };
    } else if (isOutcomeCorrect) {
      return { text: '+1 PT', className: 'green-badge', label: 'Resultado Correcto', icon: 'check' };
    } else {
      return { text: '0 PTS', className: 'gray-badge', label: 'Predicción Incorrecta', icon: 'close' };
    }
  }, [isLocked, outcome, homeGoals, awayGoals, match.homeGoals, match.awayGoals]);

  const sharePrediction = async () => {
    if (!outcome || homeGoals == null || awayGoals == null) {
      notifyInfo('Pick incompleto', 'Primero captura ganador y marcador para compartir tu predicción.');
      return;
    }
    await shareTextCard({
      title: `${homeName} ${homeGoals} - ${awayGoals} ${awayName}`,
      subtitle: `Mi prediccion · ${fmtDay(match.date)} ${match.time}`,
      lines: [
        `Partido: ${homeName} vs ${awayName}`,
        `Resultado elegido: ${OUTCOMES.find((o) => o.id === outcome)?.label ?? outcome}`,
        `Marcador: ${homeGoals}-${awayGoals}`,
        lockLabel(match),
      ],
      footer: 'Quiniela familiar Mundial 2026',
      fileName: `prediccion-${match.id}.png`,
    });
  };

  return (
    <div className={`card pool-match${isLocked ? ' is-locked' : ''}`}>
      <div className="pool-match-head">
        {match.status === 'LIVE' ? (
          <span className="pool-match-status-pill live">En vivo</span>
        ) : isLocked ? (
          <span className="pool-match-status-pill ft">Finalizado</span>
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
            title={isPlayingBrief ? "Detener Minuto Táctico" : "Escuchar Minuto Táctico (IA)"}
            aria-label="Minuto Táctico"
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
            <button type="button" className="fav-btn" onClick={sharePrediction} aria-label="Compartir prediccion" title="Compartir prediccion">
              <Icon name="share" size={14} />
            </button>
            <button type="button" className="fav-btn" onClick={() => clearMatch(match.id)} aria-label="Limpiar partido">
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
      <div className="pool-picks" role="group" aria-label={`Pronóstico ${homeName} vs ${awayName}`}>
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
            {o.label}
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
            aria-label={`Goles ${homeName}`}
            disabled={isLocked}
          />
        </label>
        <span className="mono-label">Predicho</span>
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
            aria-label={`Goles ${awayName}`}
            disabled={isLocked}
          />
        </label>
      </div>

      <div className="pool-lock-note">
        <Icon name={isLocked ? 'shield' : 'clock'} size={12} />
        {lockLabel(match)}
      </div>

      {isLocked && (
        <div className="pool-match-real-score">
          <span>Resultado Real</span>
          <strong>{match.homeGoals ?? 0} - {match.awayGoals ?? 0}</strong>
        </div>
      )}
    </div>
  );
}
