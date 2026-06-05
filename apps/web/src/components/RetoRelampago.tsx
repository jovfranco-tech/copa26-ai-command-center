import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { notifyWarning, notifyInfo } from '@/store/notifications';
import { useT } from '@/i18n';

interface Challenge {
  id: string;
  matchId: string;
  matchName: string;
  title: string;
  options: string[];
  votes: Record<string, number>;
  createdBy: string;
  status: 'active' | 'resolved';
  result?: string;
  createdAt?: string;
}

interface RetoRelampagoProps {
  playerName: string;
  activeMatchId: string;
  activeMatchName: string;
}

export function RetoRelampago({ playerName, activeMatchId, activeMatchName }: RetoRelampagoProps) {
  const t = useT();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState(() => t('reto.defaultQuestion'));
  const [newOptions, setNewOptions] = useState<string[]>(() => ['México', 'Argentina', t('reto.none')]);
  const [customOption, setCustomOption] = useState('');
  const [votedIds, setVotedIds] = useState<Record<string, string>>({}); // challengeId -> option

  // Load challenges from Firestore for this match in real-time
  useEffect(() => {
    const q = collection(db, 'flashChallenges');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Challenge[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.matchId === activeMatchId) {
          list.push({
            id: docSnap.id,
            ...data,
          } as Challenge);
        }
      });
      setChallenges(list.sort((a, b) => (dataCreated(b) - dataCreated(a))));
    });

    return () => unsubscribe();
  }, [activeMatchId]);

  const dataCreated = (c: Pick<Challenge, 'createdAt'>) => {
    return c.createdAt ? new Date(c.createdAt).getTime() : 0;
  };

  const playHaptic = (pattern: number[]) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  };

  // Create a new Flash Challenge in Firestore
  const handleCreateChallenge = async () => {
    if (!playerName.trim()) {
      notifyWarning(t('pool.nameRequired'), t('reto.enterNameChallenge'));
      return;
    }
    if (!newTitle.trim()) {
      notifyInfo(t('reto.incompleteTitle'), t('reto.incompleteText'));
      return;
    }
    if (newOptions.filter(o => o.trim()).length < 2) {
      notifyInfo(t('reto.fewOptionsTitle'), t('reto.fewOptionsText'));
      return;
    }

    try {
      const votesInit: Record<string, number> = {};
      const filteredOptions = newOptions.filter(o => o.trim());
      filteredOptions.forEach(opt => {
        votesInit[opt] = 0;
      });

      await addDoc(collection(db, 'flashChallenges'), {
        matchId: activeMatchId,
        matchName: activeMatchName,
        title: newTitle,
        options: filteredOptions,
        votes: votesInit,
        createdBy: playerName,
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      playHaptic([40, 20]);
      setCreating(false);
      setNewTitle(t('reto.defaultQuestion'));
      setNewOptions(['México', 'Argentina', t('reto.none')]);
    } catch (err) {
      console.error('Error creating challenge:', err);
    }
  };

  // Vote for a challenge option
  const handleVote = async (challengeId: string, option: string) => {
    if (!playerName.trim()) {
      notifyWarning(t('pool.nameRequired'), t('reto.enterNameVote'));
      return;
    }
    if (votedIds[challengeId]) return;

    try {
      const docRef = doc(db, 'flashChallenges', challengeId);
      await updateDoc(docRef, {
        [`votes.${option}`]: increment(1),
      });

      setVotedIds(prev => ({ ...prev, [challengeId]: option }));
      playHaptic([20, 10, 20]);
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  // Resolve a challenge (only creator can do this)
  const handleResolve = async (challengeId: string, winningOption: string) => {
    try {
      const docRef = doc(db, 'flashChallenges', challengeId);
      await updateDoc(docRef, {
        status: 'resolved',
        result: winningOption,
      });
      playHaptic([50, 50]);
    } catch (err) {
      console.error('Error resolving:', err);
    }
  };

  const addCustomOption = () => {
    if (!customOption.trim()) return;
    if (newOptions.includes(customOption.trim())) return;
    setNewOptions(prev => [...prev, customOption.trim()]);
    setCustomOption('');
  };

  const removeOption = (index: number) => {
    setNewOptions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="card card-pad animate-fade-in"
      style={{
        background: 'rgba(12, 12, 16, 0.9)',
        border: '1px solid var(--gold-line)',
        borderRadius: 16,
        marginBottom: 20,
      }}
    >
      <div className="row spread align-center" style={{ marginBottom: 12 }}>
        <div className="row gap-8 align-center">
          <span style={{ fontSize: 20 }}>⚡</span>
          <h4 style={{ margin: 0, color: 'var(--gold)' }}>{t('reto.title', { match: activeMatchName })}</h4>
        </div>
        {!creating && (
          <button
            type="button"
            className="btn gold btn-sm"
            onClick={() => setCreating(true)}
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            {t('reto.launch')}
          </button>
        )}
      </div>

      {creating && (
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
          <h5 style={{ margin: '0 0 10px 0', color: 'var(--gold-2)', fontSize: 13.5 }}>{t('reto.createMini')}</h5>

          <div style={{ marginBottom: 10 }}>
            <label className="mono-label" style={{ fontSize: 9.5, marginBottom: 4, display: 'block' }}>{t('reto.questionLabel')}</label>
            <input
              className="searchbox"
              style={{ width: '100%', fontSize: 12.5 }}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('reto.questionPlaceholder')}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="mono-label" style={{ fontSize: 9.5, marginBottom: 4, display: 'block' }}>{t('reto.optionsLabel')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {newOptions.map((opt, i) => (
                <div key={i} className="row spread align-center" style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{opt}</span>
                  {newOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="searchbox"
                style={{ flex: 1, fontSize: 11.5 }}
                value={customOption}
                onChange={(e) => setCustomOption(e.target.value)}
                placeholder={t('reto.addOptionPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && addCustomOption()}
              />
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={addCustomOption}
                style={{ fontSize: 11.5, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                {t('reto.add')}
              </button>
            </div>
          </div>

          <div className="row gap-6 justify-end" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => setCreating(false)}
              style={{ fontSize: 11.5 }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn gold btn-sm"
              onClick={handleCreateChallenge}
              style={{ fontSize: 11.5, padding: '4px 14px' }}
            >
              {t('reto.publish')}
            </button>
          </div>
        </div>
      )}

      {challenges.length === 0 ? (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '20px 0', fontStyle: 'italic' }}>
          {t('reto.empty')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {challenges.map((c) => {
            const totalVotes = Object.values(c.votes).reduce((s, v) => s + v, 0);
            const userVote = votedIds[c.id];
            const isCreator = c.createdBy === playerName;

            return (
              <div
                key={c.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div className="row spread align-center" style={{ marginBottom: 8 }}>
                  <span className="mono-label" style={{ fontSize: 9, color: 'var(--gold-2)' }}>
                    {t('reto.launchedBy', { name: c.createdBy })}
                  </span>
                  <span
                    className="live-badge"
                    style={{
                      fontSize: 8.5,
                      background: c.status === 'active' ? 'rgba(201, 162, 75, 0.15)' : 'rgba(255,255,255,0.06)',
                      color: c.status === 'active' ? 'var(--gold)' : 'var(--tx-3)',
                      borderColor: c.status === 'active' ? 'var(--gold-line)' : 'var(--line)',
                      animation: c.status === 'active' ? 'live-pulse-activity 2s infinite alternate' : 'none',
                    }}
                  >
                    {c.status === 'active' ? t('common.live') : t('reto.resolved')}
                  </span>
                </div>

                <h5 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700 }}>{c.title}</h5>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {c.options.map((opt) => {
                    const votes = c.votes[opt] || 0;
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isWinning = c.status === 'resolved' && c.result === opt;
                    const didVoteThis = userVote === opt;

                    return (
                      <div key={opt} style={{ position: 'relative' }}>
                        {c.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleVote(c.id, opt)}
                            disabled={Boolean(userVote)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              background: didVoteThis
                                ? 'rgba(201, 162, 75, 0.15)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: didVoteThis
                                ? '1px solid var(--gold)'
                                : '1px solid rgba(255,255,255,0.05)',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: 12,
                              fontWeight: didVoteThis ? 700 : 500,
                              cursor: userVote ? 'default' : 'pointer',
                              color: 'var(--tx)',
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              zIndex: 1,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <span>{opt}</span>
                            {Boolean(userVote) && (
                              <span className="muted" style={{ fontSize: 10.5, fontWeight: 700 }}>
                                {t('reto.votesShort', { v: votes, pct })}
                              </span>
                            )}
                          </button>
                        ) : (
                          <div
                            style={{
                              background: isWinning
                                ? 'rgba(16, 185, 129, 0.08)'
                                : 'rgba(255,255,255,0.02)',
                              border: isWinning
                                ? '1px solid #10b981'
                                : '1px solid rgba(255,255,255,0.03)',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: 12,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              color: isWinning ? '#10b981' : 'var(--tx-3)',
                            }}
                          >
                            <span style={{ fontWeight: isWinning ? 700 : 500 }}>
                              {opt} {isWinning && '🏆'}
                            </span>
                            <span style={{ fontSize: 10 }}>
                              {t('reto.votesLong', { v: votes, pct })}
                            </span>
                          </div>
                        )}

                        {/* Animated Percentage Fill Bar */}
                        {Boolean(userVote) && c.status === 'active' && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: `${pct}%`,
                              background: didVoteThis
                                ? 'rgba(201, 162, 75, 0.08)'
                                : 'rgba(255,255,255,0.02)',
                              borderRadius: 8,
                              zIndex: 0,
                              pointerEvents: 'none',
                              transition: 'width 0.5s ease-out',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Creator resolution controls */}
                {isCreator && c.status === 'active' && (
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                    <span className="mono-label" style={{ fontSize: 8.5, display: 'block', marginBottom: 6 }}>
                      {t('reto.resolutionPanel')}
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className="btn ghost btn-sm"
                          onClick={() => handleResolve(c.id, opt)}
                          style={{
                            fontSize: 10,
                            padding: '3px 8px',
                            borderColor: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                          }}
                        >
                          {t('reto.won', { opt })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
