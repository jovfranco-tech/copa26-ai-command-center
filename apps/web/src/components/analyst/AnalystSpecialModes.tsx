import { useMemo, useState, useRef } from 'react';
import { Icon } from '@worldcup/ui';
import { type Match as WorldCupMatch } from '@worldcup/shared';

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
  const [homePlayers, setHomePlayers] = useState([
    { id: 'h1', role: 'Delantero', x: 120, y: 80, label: 'Delantero Centro' },
    { id: 'h2', role: 'Mediocentro', x: 80, y: 150, label: 'Volante Creativo' },
    { id: 'h3', role: 'Defensa', x: 120, y: 220, label: 'Cierre Defensivo' },
  ]);
  const [awayPlayers, setAwayPlayers] = useState([
    { id: 'a1', role: 'Delantero', x: 120, y: 320, label: 'Punta Veloz' },
    { id: 'a2', role: 'Mediocentro', x: 180, y: 250, label: 'Contención' },
    { id: 'a3', role: 'Defensa', x: 120, y: 180, label: 'Líbero' },
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
      <h4 style={{ margin: '0 0 10px 0', color: 'var(--gold)' }}>🦅 Pizarra del Analista: Ojo del Halcón IA</h4>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 14 }}>
        Arrastra las fichas tácticas doradas ({homeTeam || 'Local'}) y verdes ({awayTeam || 'Visita'}) en el césped táctico para planificar su enfrentamiento en vivo.
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
        <span className="mono-label" style={{ fontSize: 10.5 }}>Configuración activa: 3 vs 3 táctico</span>
        <button
          type="button"
          className="btn gold"
          style={{ padding: '6px 14px', fontSize: 12.5 }}
          onClick={() => {
            const report =
              `**ANÁLISIS HAWK-EYE TÁCTICO (${homeTeam} vs ${awayTeam}):**\n\n` +
              `1. **Disposición Local (${homeTeam}):** Con un delantero centro posicionado ofensivamente en (${homePlayers[0].x}, ${homePlayers[0].y}) y soporte creativo, logran un carril de aproximación rápido en el flanco izquierdo.\n` +
              `2. **Bloque Defensivo de ${awayTeam}:** El líbero ubicado en (${awayPlayers[2].x}, ${awayPlayers[2].y}) intercepta eficazmente el juego aéreo, forzando disparos de media distancia.\n` +
              `3. **Veredicto del Analista:** El posicionamiento favorece un contragolpe rápido de ${awayTeam} debido al adelantamiento de líneas locales. Resultado estimado: 1-2 a favor de ${awayTeam}.`;
            onSimulate(report);
            if ('vibrate' in navigator) navigator.vibrate([20, 40, 20]);
          }}
          disabled={simulating || !homeTeam || !awayTeam}
        >
          <Icon name={simulating ? 'sparkSmall' : 'ai'} size={13} />
          {simulating ? 'Computando...' : 'Simular Choque'}
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
  const [activeJournalist, setActiveJournalist] = useState<'jeanluc' | 'gary' | 'diego'>('jeanluc');
  const [userResponse, setUserResponse] = useState('');

  const selectedMatch = matches.find((m) => m.id === matchId) || matches[0];

  const questions = useMemo(() => {
    if (!selectedMatch) return { jeanluc: '', gary: '', diego: '' };
    const h = selectedMatch.home;
    const a = selectedMatch.away;
    return {
      jeanluc: `¿Crees que el planteamiento defensivo de ${h} será suficiente para anular la fluidez táctica de ${a}?`,
      gary: `Los modelos de Expected Goals (xG) otorgan a ${a} una ventaja del 64%. ¿Cuál es tu argumento analítico para tu pick?`,
      diego: `¡Che! ¿Realmente pensás que la pasión de ${h} alcanzará para arrebatarle el resultado a ${a} en este partido de gala?`,
    };
  }, [selectedMatch]);

  return (
    <div className="card card-pad animate-fade-in" style={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid var(--gold-line)' }}>
      <div className="row gap-8 align-center" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>🎙️</span>
        <h4 style={{ margin: 0, color: 'var(--gold)' }}>Sala de Prensa Oficial: Copa del Mundo</h4>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 16 }}>
        Responde a las preguntas de la prensa deportiva internacional sobre el partido {selectedMatch ? `${selectedMatch.home} vs ${selectedMatch.away}` : 'destacado'}.
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
          placeholder="Escribe tu justificación táctica para la prensa..."
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
        />
        <div className="row spread align-center">
          <span className="mono-label" style={{ fontSize: 10 }}>Filtro de prensa activo: Moderado</span>
          <button
            type="button"
            className="btn gold"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
            onClick={() => {
              if (!userResponse.trim()) {
                alert('Escribe una respuesta para responder a la prensa.');
                return;
              }
              const score = Math.floor(Math.random() * 20) + 80;
              const reporterName = activeJournalist === 'jeanluc' ? "Jean-Luc (L'Equipe)" : activeJournalist === 'gary' ? "Gary (The Athletic)" : "Diego (TyC Sports)";
              const feedback =
                `**RUEDA DE PRENSA: EVALUACIÓN DEL COMENTARIO TÁCTICO**\n\n` +
                `*   **Pregunta de:** ${reporterName}\n` +
                `*   **Tu respuesta:** "${userResponse}"\n\n` +
                `⚽ **Nivel de Aprobación de la Prensa:** ${score}%\n\n` +
                `*   **Comentario del Panel:** Tu análisis destaca por una sólida comprensión del parado táctico y la diferencia física. ` +
                `Sin embargo, algunos redactores señalan que subestimas las jugadas a balón parado. ¡Una rueda de prensa sumamente elocuente!`;
              onAnswer(feedback);
              setUserResponse('');
              if ('vibrate' in navigator) navigator.vibrate([30, 10, 30]);
            }}
            disabled={answering}
          >
            🎙️ Responder a la Prensa
          </button>
        </div>
      </div>
    </div>
  );
}
