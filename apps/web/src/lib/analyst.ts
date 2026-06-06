/**
 * Local analyst — builds answers ONLY from the locally loaded data. No internet
 * calls. It does not invent: every sentence is assembled from the received
 * numbers, and it reports which local tables it used. Output language follows the
 * provided translator (Spanish by default), and question matching accepts both
 * Spanish and English keywords.
 */
import { avg, fmtFull, type Match, type Player, type StandingRow, type Team, type Venue } from '@worldcup/shared';
import type { AICitation, AIStructuredAnswer } from '@/lib/aiMemory';
import { tEs, type Translate } from '@/i18n';
import { playerRatings, ratingSourceText } from '@/lib/ratings';

export interface AnalystInput {
  question: string;
  ctx: 'tournament' | 'match' | 'team' | 'player';
  id?: string;
  teams: Team[];
  players: Player[];
  matches: Match[];
  venues?: Venue[];
  standings: Record<string, StandingRow[]>;
}

export interface AnalystAnswer {
  text: string;
  sources: string[];
  structured?: AIStructuredAnswer;
  citations?: AICitation[];
}

function teamName(teams: Team[], code: string): string {
  return teams.find((t) => t.code === code)?.name ?? code;
}

function venueName(venues: Venue[] | undefined, id: string): string {
  const v = venues?.find((x) => x.id === id);
  return v ? `${v.stadium}, ${v.city}` : id;
}

function firstMatch(matches: Match[]): Match | undefined {
  return [...matches].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
}

function matchCitation(match: Match, teams: Team[], venues: Venue[] | undefined, t: Translate): AICitation[] {
  return [
    {
      label: t('analyst.cMatch'),
      value: `${teamName(teams, match.home)} vs ${teamName(teams, match.away)} · ${fmtFull(match.date)} ${match.time}`,
      source: t('analyst.cMatchSource'),
      date: '2026-05-31',
      confidence: t('analyst.confHigh'),
    },
    {
      label: t('analyst.cVenue'),
      value: venueName(venues, match.venue),
      source: t('analyst.cVenueSource'),
      date: '2026-05-31',
      confidence: t('analyst.confHigh'),
    },
  ];
}

function structuredReport(s: AIStructuredAnswer, t: Translate): AIStructuredAnswer {
  const { prediction, risk, confidence, dataUsed, ignoredData, rationale, nextAction } = s;
  const c = (confidence ?? '').toLowerCase();
  const isHigh = c.includes('alta') || c.includes('high');
  const isMed = c.includes('media') || c.includes('medium');
  return {
    prediction,
    risk,
    confidence,
    dataUsed,
    ignoredData,
    rationale,
    nextAction,
    quality: {
      score: isHigh ? 92 : isMed ? 78 : 64,
      label: isHigh ? t('analyst.qVerified') : t('analyst.qNeedsReview'),
      flags: [
        t('analyst.qBuiltLocal'),
        ...(risk ? [risk] : []),
        ...(ignoredData?.length ? [t('analyst.qIgnored', { data: ignoredData.join(', ') })] : []),
      ],
      checkedAt: new Date().toISOString(),
    },
  };
}

export function buildAnalystAnswer(input: AnalystInput, t: Translate = tEs): AnalystAnswer {
  const { ctx, id, teams, players, matches, venues, standings } = input;
  const q = input.question.toLowerCase();
  const played = matches.filter((m) => m.status === 'FT');
  const goals = played.reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
  const scorers = [...players].sort((a, b) => b.goals - a.goals);
  const opening = firstMatch(matches);
  const asksOpening =
    q.includes('primer partido') ||
    q.includes('partido inaugural') ||
    q.includes('inaugural') ||
    q.includes('apertura') ||
    q.includes('arranca') ||
    q.includes('inicia') ||
    q.includes('first match') ||
    q.includes('opening') ||
    q.includes('opener') ||
    q.includes('kickoff') ||
    q.includes('kick off') ||
    q.includes('starts');

  if (asksOpening && opening) {
    return {
      text: t('analyst.openingText', {
        home: teamName(teams, opening.home),
        away: teamName(teams, opening.away),
        date: fmtFull(opening.date),
        time: opening.time,
        venue: venueName(venues, opening.venue),
        stage: opening.stage,
      }),
      sources: ['partidos', 'sedes'],
      structured: structuredReport({
        prediction: t('analyst.openPred'),
        risk: t('analyst.openRisk'),
        confidence: t('analyst.openConf'),
        dataUsed: t('analyst.openData').split(', '),
        ignoredData: t('analyst.openIgn').split(', '),
        rationale: t('analyst.openRat'),
        nextAction: t('analyst.openNext'),
      }, t),
      citations: matchCitation(opening, teams, venues, t),
    };
  }

  if (ctx === 'match' && id) {
    const m = matches.find((x) => x.id === id);
    if (!m) return { text: t('analyst.matchNotFound'), sources: ['partidos'] };
    const h = teamName(teams, m.home);
    const a = teamName(teams, m.away);
    const lines: string[] = [];
    if (m.status === 'UPCOMING') {
      lines.push(t('analyst.matchUpcoming', { h, a, date: fmtFull(m.date), time: m.time, stage: m.stage }));
    } else {
      const status = m.status === 'LIVE' ? t('analyst.matchLiveStatus', { min: m.minute ?? 0 }) : t('analyst.matchFinalStatus');
      lines.push(t('analyst.matchPlayed', { h, hg: m.homeGoals ?? 0, ag: m.awayGoals ?? 0, a, status, stage: m.stage }));
      if (m.possH != null) lines.push(t('analyst.matchPossession', { ph: m.possH, pa: 100 - m.possH, sh: m.shotsH ?? 0, sa: m.shotsA ?? 0 }));
    }
    const hs = standings[m.group]?.find((r) => r.team === m.home);
    const as = standings[m.group]?.find((r) => r.team === m.away);
    if (hs && as) lines.push(t('analyst.matchGroupLine', { g: m.group, home: m.home, hp: hs.Pts, away: m.away, ap: as.Pts }));
    return {
      text: lines.join(' '),
      sources: ['partidos', 'clasificación'],
      structured: structuredReport({
        prediction: m.status === 'UPCOMING' ? t('analyst.matchPredUpcoming') : t('analyst.matchPredPlayed'),
        risk: m.status === 'UPCOMING' ? t('analyst.matchRiskUpcoming') : t('analyst.matchRiskPlayed'),
        confidence: m.status === 'UPCOMING' ? t('analyst.matchConfUpcoming') : t('analyst.matchConfPlayed'),
        dataUsed: t('analyst.matchDataUsed').split(', '),
        ignoredData: (m.status === 'UPCOMING' ? t('analyst.matchIgnUpcoming') : t('analyst.matchIgnPlayed')).split(', '),
        rationale: t('analyst.matchRat'),
        nextAction: m.status === 'UPCOMING' ? t('analyst.matchNextUpcoming') : t('analyst.matchNextPlayed'),
      }, t),
      citations: [
        ...matchCitation(m, teams, venues, t),
        ...(hs && as
          ? [
              {
                label: t('analyst.cGroup', { g: m.group }),
                value: t('analyst.cGroupVal', { home: m.home, hp: hs.Pts, away: m.away, ap: as.Pts }),
                source: t('analyst.cGroupSource'),
                date: '2026-05-31',
                confidence: t('analyst.confHigh'),
              },
            ]
          : []),
      ],
    };
  }

  if (ctx === 'team' && id) {
    const team = teams.find((x) => x.code === id);
    if (!team) return { text: t('analyst.teamNotFound'), sources: ['selecciones'] };
    const row = standings[team.group]?.find((r) => r.team === team.code);
    const topTeamScorer = scorers.find((p) => p.team === team.code);
    const next = matches.find((m) => (m.home === team.code || m.away === team.code) && m.status !== 'FT');
    const lines: string[] = [];
    if (row)
      lines.push(t('analyst.teamRow', { name: team.name, g: team.group, pts: row.Pts, w: row.W, d: row.D, l: row.L, gd: `${row.GD >= 0 ? '+' : ''}${row.GD}` }));
    else lines.push(t('analyst.teamNoRow', { name: team.name, g: team.group }));
    if (topTeamScorer && topTeamScorer.goals > 0)
      lines.push(t('analyst.teamScorer', { name: topTeamScorer.name, goals: topTeamScorer.goals }));
    if ((q.includes('forma') || q.includes('form')) && row) lines.push(t('analyst.teamForm', { form: row.form.join('-') || t('analyst.formNone') }));
    if (next) {
      const opp = next.home === team.code ? next.away : next.home;
      lines.push(t('analyst.teamNext', { opp: teamName(teams, opp), date: fmtFull(next.date) }));
    }
    return {
      text: lines.join(' '),
      sources: ['selecciones', 'clasificación', 'partidos'],
      structured: structuredReport({
        prediction: next ? t('analyst.teamPredNext', { name: team.name, opp: teamName(teams, next.home === team.code ? next.away : next.home) }) : t('analyst.teamPredNone'),
        risk: t('analyst.teamRisk'),
        confidence: row ? t('analyst.teamConfRow') : t('analyst.teamConfNoRow'),
        dataUsed: t('analyst.teamDataUsed').split(', '),
        ignoredData: t('analyst.teamIgn').split(', '),
        rationale: t('analyst.teamRat'),
        nextAction: next ? t('analyst.teamNextHas') : t('analyst.teamNextNone'),
      }, t),
      citations: [
        {
          label: t('analyst.cTeam'),
          value: t('analyst.cTeamVal', { name: team.name, g: team.group, rank: team.ranking ?? t('analyst.rankingPending') }),
          source: t('analyst.cTeamSource'),
          date: '2026-05-31',
          confidence: t('analyst.confHigh'),
        },
        ...(row
          ? [
              {
                label: t('analyst.cTable'),
                value: t('analyst.cTableVal', { pts: row.Pts, w: row.W, d: row.D, l: row.L, gd: row.GD }),
                source: t('analyst.cTableSource'),
                date: '2026-05-31',
                confidence: t('analyst.confHigh'),
              },
            ]
          : []),
        ...(next ? matchCitation(next, teams, venues, t).slice(0, 1) : []),
      ],
    };
  }

  if (ctx === 'player' && id) {
    const p = players.find((x) => x.id === id);
    if (!p) return { text: t('analyst.playerNotFound'), sources: ['jugadores'] };
    const rank = scorers.findIndex((x) => x.id === p.id) + 1;
    const lines = [
      t('analyst.playerLine', { name: p.name, team: teamName(teams, p.team), pos: p.posLong ?? p.pos, club: p.club, goals: p.goals, assists: p.assists, min: p.minutes }),
    ];
    if (p.goals > 0) lines.push(t('analyst.playerRank', { rank }));
    if (p.yellow || p.red) lines.push(t('analyst.playerDiscipline', { y: p.yellow, r: p.red }));
    const rating = playerRatings(p);
    return {
      text: lines.join(' '),
      sources: ['jugadores', 'ratings'],
      structured: structuredReport({
        prediction: t('analyst.playerPred', { name: p.name, ovr: rating.overall }),
        risk: rating.source === 'estimate' ? t('analyst.playerRiskEstimate') : t('analyst.playerRiskPublic'),
        confidence: rating.source === 'fc26' ? t('analyst.playerConfPublic') : t('analyst.playerConfEstimate'),
        dataUsed: t('analyst.playerDataUsed').split(', '),
        ignoredData: t('analyst.playerIgn').split(', '),
        rationale: rating.source === 'fc26' ? t('analyst.playerRatPublic') : t('analyst.playerRatEstimate'),
        nextAction: t('analyst.playerNext'),
      }, t),
      citations: [
        {
          label: t('analyst.cPlayer'),
          value: t('analyst.cPlayerVal', { name: p.name, team: teamName(teams, p.team), pos: p.posLong ?? p.pos, club: p.club }),
          source: t('analyst.cPlayerSource'),
          date: '2026-05-31',
          confidence: t('analyst.cPlayerConf'),
        },
        {
          label: t('analyst.cRating'),
          value: t('analyst.cRatingVal', { ovr: rating.overall, pace: rating.pace, sho: rating.shooting, pas: rating.passing }),
          source: ratingSourceText(rating),
          date: rating.source === 'fc26' ? '2026-05-30' : '2026-05-31',
          confidence: rating.source === 'fc26' ? t('analyst.confHigh') : t('analyst.confMedium'),
        },
      ],
    };
  }

  // tournament (default)
  const leaderA = standings.A?.[0];
  const top = scorers[0];
  const upcoming = matches.filter((m) => m.status === 'UPCOMING');
  const lines: string[] = [];
  if (played.length) {
    lines.push(t('analyst.tourPlayed', { n: played.length, goals, avg: avg(goals, played.length) }));
  } else {
    lines.push(t('analyst.tourPreview', { n: upcoming.length }));
    if (opening) {
      lines.push(t('analyst.tourOpening', { home: teamName(teams, opening.home), away: teamName(teams, opening.away), date: fmtFull(opening.date), time: opening.time }));
    }
  }
  if (top && top.goals > 0) lines.push(t('analyst.tourTopScorer', { name: top.name, goals: top.goals, assists: top.assists }));
  if (leaderA) {
    lines.push(
      played.length
        ? t('analyst.tourGroupALeader', { name: teamName(teams, leaderA.team), pts: leaderA.Pts })
        : t('analyst.tourGroupAPreview', { teams: (standings.A ?? []).map((r) => teamName(teams, r.team)).join(', ') }),
    );
  }
  if (q.includes('vivo') || q.includes('live')) {
    const live = matches.filter((m) => m.status === 'LIVE');
    lines.push(live.length ? t('analyst.tourLive', { n: live.length }) : t('analyst.tourNoLive'));
  }
  return {
    text: lines.join(' '),
    sources: ['partidos', 'jugadores', 'clasificación'],
    structured: structuredReport({
      prediction: played.length ? t('analyst.tourPredPlayed') : t('analyst.tourPredPreview'),
      risk: t('analyst.tourRisk'),
      confidence: t('analyst.tourConf'),
      dataUsed: t('analyst.tourDataUsed').split(', '),
      ignoredData: t('analyst.tourIgn').split(', '),
      rationale: t('analyst.tourRat'),
      nextAction: t('analyst.tourNext'),
    }, t),
    citations: [
      {
        label: t('analyst.cCalendar'),
        value: t('analyst.cCalendarVal', { total: matches.length, upcoming: upcoming.length, played: played.length }),
        source: t('analyst.cCalendarSource'),
        date: '2026-05-31',
        confidence: t('analyst.confHigh'),
      },
      ...(opening ? matchCitation(opening, teams, venues, t).slice(0, 1) : []),
    ],
  };
}

export function getSuggestedQuestions(t: Translate = tEs): string[] {
  return [t('analyst.sq1'), t('analyst.sq2'), t('analyst.sq3'), t('analyst.sq4'), t('analyst.sq5')];
}

/** Spanish-default suggested questions (back-compat for non-React callers). */
export const SUGGESTED_QUESTIONS = getSuggestedQuestions();
