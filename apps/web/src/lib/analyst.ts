/**
 * Local "Match Analyst" — produces a grounded answer from local cached data ONLY.
 * No network calls. It never invents facts: every sentence is built from the
 * numbers passed in, and it reports which local tables it used.
 */
import { avg, fmtFull, type Match, type Player, type StandingRow, type Team } from '@worldcup/shared';

export interface AnalystInput {
  question: string;
  ctx: 'tournament' | 'match' | 'team' | 'player';
  id?: string;
  teams: Team[];
  players: Player[];
  matches: Match[];
  standings: Record<string, StandingRow[]>;
}

export interface AnalystAnswer {
  text: string;
  sources: string[];
}

function teamName(teams: Team[], code: string): string {
  return teams.find((t) => t.code === code)?.name ?? code;
}

export function buildAnalystAnswer(input: AnalystInput): AnalystAnswer {
  const { ctx, id, teams, players, matches, standings } = input;
  const q = input.question.toLowerCase();
  const played = matches.filter((m) => m.status === 'FT');
  const goals = played.reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
  const scorers = [...players].sort((a, b) => b.goals - a.goals);

  if (ctx === 'match' && id) {
    const m = matches.find((x) => x.id === id);
    if (!m) return { text: 'That match is not in the local dataset.', sources: ['matches'] };
    const h = teamName(teams, m.home);
    const a = teamName(teams, m.away);
    const lines: string[] = [];
    if (m.status === 'UPCOMING') {
      lines.push(`${h} face ${a} on ${fmtFull(m.date)} at ${m.time} (${m.stage}).`);
    } else {
      lines.push(`${h} ${m.homeGoals}–${m.awayGoals} ${a} (${m.status === 'LIVE' ? `live, ${m.minute}'` : 'full time'}, ${m.stage}).`);
      if (m.possH != null) lines.push(`Possession was ${m.possH}% / ${100 - m.possH}%, shots ${m.shotsH ?? 0}–${m.shotsA ?? 0}.`);
    }
    const hs = standings[m.group]?.find((r) => r.team === m.home);
    const as = standings[m.group]?.find((r) => r.team === m.away);
    if (hs && as) lines.push(`In Group ${m.group}, ${m.home} have ${hs.Pts} pts and ${m.away} ${as.Pts} pts.`);
    return { text: lines.join(' '), sources: ['matches', 'standings'] };
  }

  if (ctx === 'team' && id) {
    const t = teams.find((x) => x.code === id);
    if (!t) return { text: 'That team is not in the local dataset.', sources: ['teams'] };
    const row = standings[t.group]?.find((r) => r.team === t.code);
    const topTeamScorer = scorers.find((p) => p.team === t.code);
    const next = matches.find((m) => (m.home === t.code || m.away === t.code) && m.status !== 'FT');
    const lines: string[] = [];
    if (row)
      lines.push(
        `${t.name} sit in Group ${t.group} with ${row.Pts} pts (${row.W}-${row.D}-${row.L}), GD ${row.GD >= 0 ? '+' : ''}${row.GD}.`,
      );
    if (topTeamScorer && topTeamScorer.goals > 0)
      lines.push(`Their top scorer is ${topTeamScorer.name} with ${topTeamScorer.goals} goals.`);
    if (q.includes('form') && row) lines.push(`Recent form: ${row.form.join('-') || 'none yet'}.`);
    if (next) {
      const opp = next.home === t.code ? next.away : next.home;
      lines.push(`Next up: ${teamName(teams, opp)} on ${fmtFull(next.date)}.`);
    }
    return { text: lines.join(' ') || `${t.name} has no recorded results yet.`, sources: ['teams', 'standings', 'players', 'matches'] };
  }

  if (ctx === 'player' && id) {
    const p = players.find((x) => x.id === id);
    if (!p) return { text: 'That player is not in the local dataset.', sources: ['players'] };
    const rank = scorers.findIndex((x) => x.id === p.id) + 1;
    const lines = [
      `${p.name} (${teamName(teams, p.team)}, ${p.posLong ?? p.pos}, ${p.club}) has ${p.goals} goals and ${p.assists} assists in ${p.minutes} minutes.`,
    ];
    if (p.goals > 0) lines.push(`That ranks #${rank} among local scorers.`);
    if (p.yellow || p.red) lines.push(`Discipline: ${p.yellow} yellow, ${p.red} red.`);
    return { text: lines.join(' '), sources: ['players'] };
  }

  // tournament default
  const leaderA = standings.A?.[0];
  const top = scorers[0];
  const lines = [
    `Across ${played.length} completed matches, ${goals} goals have been scored (${avg(goals, played.length)} per game).`,
  ];
  if (top) lines.push(`${top.name} leads the scoring with ${top.goals} goals and ${top.assists} assists.`);
  if (leaderA) lines.push(`Group A is led by ${teamName(teams, leaderA.team)} on ${leaderA.Pts} pts.`);
  if (q.includes('live')) {
    const live = matches.filter((m) => m.status === 'LIVE');
    lines.push(live.length ? `${live.length} match(es) are live right now.` : 'No matches are live right now.');
  }
  return { text: lines.join(' '), sources: ['matches', 'players', 'standings'] };
}

export const SUGGESTED_QUESTIONS = [
  'Give me a tournament overview',
  'Who is leading the scoring charts?',
  'How is this team performing?',
  'Summarise this match',
  'What is the recent form?',
];
