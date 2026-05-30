import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { Dashboard } from '@/routes/Dashboard';
import { MatchCenter } from '@/routes/MatchCenter';
import { MatchDetail } from '@/routes/MatchDetail';
import { Teams } from '@/routes/Teams';
import { TeamDetail } from '@/routes/TeamDetail';
import { Players } from '@/routes/Players';
import { PlayerDetail } from '@/routes/PlayerDetail';
import { Standings } from '@/routes/Standings';
import { Stats } from '@/routes/Stats';
import { Bracket } from '@/routes/Bracket';
import { Venues } from '@/routes/Venues';
import { Favorites } from '@/routes/Favorites';
import { Pool } from '@/routes/Pool';
import { DataCenter } from '@/routes/DataCenter';
import { Analyst } from '@/routes/Analyst';

type AnalystCtx = 'tournament' | 'match' | 'team' | 'player';

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Dashboard });

const matchesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches',
  component: MatchCenter,
});

const matchDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches/$matchId',
  component: function MatchDetailRoute() {
    const { matchId } = matchDetailRoute.useParams();
    return <MatchDetail id={matchId} />;
  },
});

const teamsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/teams', component: Teams });

const teamDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teams/$code',
  component: function TeamDetailRoute() {
    const { code } = teamDetailRoute.useParams();
    return <TeamDetail code={code} />;
  },
});

const playersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/players', component: Players });

const playerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players/$playerId',
  component: function PlayerDetailRoute() {
    const { playerId } = playerDetailRoute.useParams();
    return <PlayerDetail id={playerId} />;
  },
});

const standingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/standings',
  validateSearch: (search: Record<string, unknown>): { group?: string } => ({
    group: typeof search.group === 'string' ? search.group : undefined,
  }),
  component: function StandingsRoute() {
    const { group } = standingsRoute.useSearch();
    return <Standings group={group} />;
  },
});

const statsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/stats', component: Stats });
const bracketRoute = createRoute({ getParentRoute: () => rootRoute, path: '/bracket', component: Bracket });
const venuesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/venues', component: Venues });
const favoritesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/favorites', component: Favorites });
const poolRoute = createRoute({ getParentRoute: () => rootRoute, path: '/pool', component: Pool });
const dataRoute = createRoute({ getParentRoute: () => rootRoute, path: '/data', component: DataCenter });

const analystRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analyst',
  validateSearch: (search: Record<string, unknown>): { ctx?: AnalystCtx; id?: string } => {
    const ctx = search.ctx;
    const valid = ctx === 'match' || ctx === 'team' || ctx === 'player' || ctx === 'tournament';
    return {
      ctx: valid ? (ctx as AnalystCtx) : undefined,
      id: typeof search.id === 'string' ? search.id : undefined,
    };
  },
  component: function AnalystRoute() {
    const { ctx, id } = analystRoute.useSearch();
    return <Analyst ctx={ctx} id={id} />;
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  matchesRoute,
  matchDetailRoute,
  teamsRoute,
  teamDetailRoute,
  playersRoute,
  playerDetailRoute,
  standingsRoute,
  statsRoute,
  bracketRoute,
  venuesRoute,
  favoritesRoute,
  poolRoute,
  dataRoute,
  analystRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
