import { eq } from 'drizzle-orm';
import { getPoolPersistenceStatus } from '../../packages/db/src/persistence.js';
import { recordUsage } from '../_shared/usage.js';

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }
  await recordUsage('pool.leaderboard');

  const persistence = getPoolPersistenceStatus();
  if (!persistence.ready) {
    return Response.json({ ok: false, error: 'persistent-db-required', persistence }, { status: 503 });
  }

  try {
    const { getDb, schema } = await import('../../packages/db/src/index.js');
    const db = getDb();

    const matchRows = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.status, 'FT'));

    const pickRows = await db.select().from(schema.poolPicks);
    const teamRows = await db.select().from(schema.teams);
    const teamMap = new Map(teamRows.map((t) => [t.id, t]));

    const playerPicks = new Map<string, typeof pickRows>();
    for (const r of pickRows) {
      const list = playerPicks.get(r.playerName) ?? [];
      list.push(r);
      playerPicks.set(r.playerName, list);
    }

    const board: Array<{
      playerName: string;
      points: number;
      exactScores: number;
      outcomeHits: number;
      efficiency: number;
      predictedCount: number;
    }> = [];

    for (const [name, picks] of playerPicks.entries()) {
      let points = 0;
      let exactScores = 0;
      let outcomeHits = 0;
      let predictedPlayedCount = 0;

      for (const m of matchRows) {
        const pick = picks.find((p) => p.matchId === m.fifaId || p.matchId === String(m.id));
        if (!pick || !pick.outcome) continue;

        predictedPlayedCount++;
        const realHome = m.homeScore ?? 0;
        const realAway = m.awayScore ?? 0;

        let realOutcome: 'home' | 'draw' | 'away' = 'draw';
        if (realHome > realAway) realOutcome = 'home';
        else if (realHome < realAway) realOutcome = 'away';

        const isExact = pick.homeGoals === realHome && pick.awayGoals === realAway;
        const isOutcomeCorrect = pick.outcome === realOutcome;

        if (isExact) {
          points += 3;
          exactScores++;
        } else if (isOutcomeCorrect) {
          points += 1;
          outcomeHits++;
        }
      }

      const efficiency = predictedPlayedCount > 0 ? Math.round(((exactScores + outcomeHits) / predictedPlayedCount) * 100) : 0;

      board.push({
        playerName: name,
        points,
        exactScores,
        outcomeHits,
        efficiency,
        predictedCount: picks.length,
      });
    }

    // Inject the 3 virtual AI agents to compete in the leaderboard
    const agents: Array<'optimista' | 'stats' | 'contrarian'> = ['optimista', 'stats', 'contrarian'];
    const agentNames = {
      optimista: '🤖 El Analista Optimista',
      stats: '🤖 El Simulador Estadístico',
      contrarian: '🤖 El Agente Contrarian',
    };

    for (const agent of agents) {
      let points = 0;
      let exactScores = 0;
      let outcomeHits = 0;
      let predictedPlayedCount = 0;

      for (const m of matchRows) {
        const homeTeam = teamMap.get(m.homeTeamId ?? -1);
        const awayTeam = teamMap.get(m.awayTeamId ?? -1);

        const homeRank = homeTeam?.ranking ?? 50;
        const awayRank = awayTeam?.ranking ?? 50;
        const rankDiff = awayRank - homeRank;

        let pred: { homeGoals: number; awayGoals: number; outcome: 'home' | 'draw' | 'away' };
        if (agent === 'optimista') {
          if (rankDiff > 10) pred = { homeGoals: 3, awayGoals: 1, outcome: 'home' };
          else if (rankDiff < -10) pred = { homeGoals: 1, awayGoals: 3, outcome: 'away' };
          else pred = { homeGoals: 2, awayGoals: 2, outcome: 'draw' };
        } else if (agent === 'stats') {
          if (rankDiff > 5) pred = { homeGoals: 1, awayGoals: 0, outcome: 'home' };
          else if (rankDiff < -5) pred = { homeGoals: 0, awayGoals: 1, outcome: 'away' };
          else pred = { homeGoals: 1, awayGoals: 1, outcome: 'draw' };
        } else {
          if (rankDiff > 15) pred = { homeGoals: 1, awayGoals: 2, outcome: 'away' };
          else if (rankDiff < -15) pred = { homeGoals: 2, awayGoals: 1, outcome: 'home' };
          else pred = { homeGoals: 0, awayGoals: 0, outcome: 'draw' };
        }

        predictedPlayedCount++;
        const realHome = m.homeScore ?? 0;
        const realAway = m.awayScore ?? 0;

        let realOutcome: 'home' | 'draw' | 'away' = 'draw';
        if (realHome > realAway) realOutcome = 'home';
        else if (realHome < realAway) realOutcome = 'away';

        const isExact = pred.homeGoals === realHome && pred.awayGoals === realAway;
        const isOutcomeCorrect = pred.outcome === realOutcome;

        if (isExact) {
          points += 3;
          exactScores++;
        } else if (isOutcomeCorrect) {
          points += 1;
          outcomeHits++;
        }
      }

      const efficiency = predictedPlayedCount > 0 ? Math.round(((exactScores + outcomeHits) / predictedPlayedCount) * 100) : 0;

      board.push({
        playerName: agentNames[agent],
        points,
        exactScores,
        outcomeHits,
        efficiency,
        predictedCount: matchRows.length,
      });
    }

    board.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      return b.efficiency - a.efficiency;
    });

    return Response.json({ ok: true, leaderboard: board });
  } catch (e) {
    console.error('leaderboard fetch failed', e);
    const msg = e instanceof Error ? e.message : 'database-error';
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
