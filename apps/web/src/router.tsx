import { type ComponentType, lazy, Suspense } from 'react';
import { Skeleton } from '@worldcup/ui';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { Dashboard } from '@/routes/Dashboard';
import { MatchCenter } from '@/routes/MatchCenter';
import { MatchDetail } from '@/routes/MatchDetail';
import { Teams } from '@/routes/Teams';
import { TeamDetail } from '@/routes/TeamDetail';
import { PlayerDetail } from '@/routes/PlayerDetail';
import { Standings } from '@/routes/Standings';
import { Bracket } from '@/routes/Bracket';
import { Favorites } from '@/routes/Favorites';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry<T extends ComponentType<any>>(componentImport: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Dynamic import failed, reloading page...', error);
      const lastReload = sessionStorage.getItem('chunk_reload');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('chunk_reload', String(now));
        window.location.reload();
      }
      throw error;
    }
  });
}

const LazyStats = lazyWithRetry(() => import('./routes/Stats').then((m) => ({ default: m.Stats })));
const LazyPlayers = lazyWithRetry(() => import('./routes/Players').then((m) => ({ default: m.Players })));
const LazyVenues = lazyWithRetry(() => import('./routes/Venues').then((m) => ({ default: m.Venues })));
const LazyPool = lazyWithRetry(() => import('./routes/Pool').then((m) => ({ default: m.Pool })));
const LazyDataCenter = lazyWithRetry(() => import('./routes/DataCenter').then((m) => ({ default: m.DataCenter })));
const LazyAnalyst = lazyWithRetry(() => import('./routes/Analyst').then((m) => ({ default: m.Analyst })));
const LazyTVMode = lazyWithRetry(() => import('./routes/TVMode').then((m) => ({ default: m.TVMode })));
const LazyEstadio3D = lazyWithRetry(() => import('./routes/Estadio3D').then((m) => ({ default: m.Estadio3D })));

const playersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: function PlayersRoute() {
    return (
      <Suspense fallback={<Skeleton h={240} />}>
        <LazyPlayers />
      </Suspense>
    );
  },
});

// eslint-disable-next-line react-refresh/only-export-components
function StatsSkeleton() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <Skeleton h={80} />
        <Skeleton h={80} />
        <Skeleton h={80} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton h={320} />
        <Skeleton h={320} />
      </div>
    </div>
  );
}

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stats',
  component: function StatsRoute() {
    return (
      <Suspense fallback={<StatsSkeleton />}>
        <LazyStats />
      </Suspense>
    );
  },
});
const bracketRoute = createRoute({ getParentRoute: () => rootRoute, path: '/bracket', component: Bracket });
const venuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/venues',
  component: function VenuesRoute() {
    return (
      <Suspense fallback={<Skeleton h={260} />}>
        <LazyVenues />
      </Suspense>
    );
  },
});
const favoritesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/favorites', component: Favorites });
const poolRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pool',
  component: function PoolRoute() {
    return (
      <Suspense fallback={<Skeleton h={260} />}>
        <LazyPool />
      </Suspense>
    );
  },
});
const dataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/data',
  component: function DataRoute() {
    return (
      <Suspense fallback={<Skeleton h={260} />}>
        <LazyDataCenter />
      </Suspense>
    );
  },
});
const tvRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tv',
  component: function TVRoute() {
    return (
      <Suspense fallback={<Skeleton h={260} />}>
        <LazyTVMode />
      </Suspense>
    );
  },
});

const estadio3DRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/estadio-3d',
  component: function Estadio3DRoute() {
    return (
      <Suspense fallback={<div className="muted" style={{ padding: 24 }}>Cargando Estadio 3D...</div>}>
        <LazyEstadio3D />
      </Suspense>
    );
  },
});

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
    return (
      <Suspense fallback={<Skeleton h={260} />}>
        <LazyAnalyst ctx={ctx} id={id} />
      </Suspense>
    );
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
  tvRoute,
  estadio3DRoute,
  analystRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultViewTransition: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
