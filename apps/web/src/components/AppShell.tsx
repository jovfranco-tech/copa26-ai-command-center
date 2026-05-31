import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Icon, type IconName } from '@worldcup/ui';
import { FOOTER_NOTICE } from '@worldcup/shared';
import { useMatches } from '@/hooks';
import { usePreferences, applyPreferences } from '@/store/preferences';
import { usePlayerFilters } from '@/store/filters';
import { TweaksPanel } from './TweaksPanel';

type StaticPath =
  | '/'
  | '/matches'
  | '/bracket'
  | '/teams'
  | '/players'
  | '/standings'
  | '/stats'
  | '/venues'
  | '/favorites'
  | '/pool'
  | '/data'
  | '/analyst';

interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  to: StaticPath;
  live?: boolean;
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Centro de mando',
    items: [
      { key: 'home', label: 'Panel', icon: 'home', to: '/' },
      { key: 'matches', label: 'Partidos', icon: 'calendar', to: '/matches', live: true },
      { key: 'bracket', label: 'Eliminatorias', icon: 'bracket', to: '/bracket' },
    ],
  },
  {
    group: 'Explorar',
    items: [
      { key: 'teams', label: 'Selecciones', icon: 'teams', to: '/teams' },
      { key: 'players', label: 'Jugadores', icon: 'players', to: '/players' },
      { key: 'standings', label: 'Grupos y tabla', icon: 'standings', to: '/standings' },
      { key: 'stats', label: 'Estadísticas', icon: 'stats', to: '/stats' },
      { key: 'venues', label: 'Sedes', icon: 'venues', to: '/venues' },
    ],
  },
  {
    group: 'Personal',
    items: [
      { key: 'pool', label: 'Quiniela', icon: 'trophy', to: '/pool' },
      { key: 'favorites', label: 'Favoritos', icon: 'star', to: '/favorites' },
      { key: 'data', label: 'Datos', icon: 'cloud', to: '/data' },
      { key: 'analyst', label: 'Analista IA', icon: 'ai', to: '/analyst' },
    ],
  },
];

const MOBILE_KEYS = ['home', 'matches', 'pool', 'standings', 'analyst'];
const ALL_ITEMS = NAV.flatMap((g) => g.items);

const TITLES: Record<string, string> = {
  home: 'Panel',
  matches: 'Centro de partidos',
  bracket: 'Eliminatorias',
  teams: 'Selecciones',
  players: 'Jugadores',
  standings: 'Grupos y clasificación',
  stats: 'Estadísticas',
  venues: 'Sedes',
  favorites: 'Favoritos',
  pool: 'Quiniela familiar',
  data: 'Centro de datos',
  analyst: 'Analista de partidos IA',
};

function activeKeyFromPath(pathname: string): string {
  if (pathname === '/') return 'home';
  const seg = pathname.split('/')[1] ?? 'home';
  return seg || 'home';
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRouterLoading = useRouterState({ select: (s) => s.status === 'pending' });
  const activeKey = activeKeyFromPath(pathname);
  const [drawer, setDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const isLocalHost =
    typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');

  const prefs = usePreferences();
  useEffect(() => {
    applyPreferences(prefs);
  }, [prefs]);

  const { data: liveData } = useMatches({ status: 'LIVE' });
  const liveCount = liveData?.items.length ?? 0;

  const setPlayerQ = usePlayerFilters((s) => s.set);
  const runSearch = () => {
    setPlayerQ({ q: searchTerm });
    navigate({ to: '/players' });
    setDrawer(false);
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.assign('/login');
    }
  };

  const Brand = () => (
    <div className="brand">
      <img className="brand-mark" src="/brand/fwc26-emblem.svg" alt="FIFA World Cup 26" />
      <div className="brand-copy">
        <img className="brand-wordmark" src="/brand/fwc26-stacked-wordmark.svg" alt="FIFA World Cup 26" />
        <div className="brand-sub">
          <span>Centro de mando</span>
          <span>Privado</span>
        </div>
      </div>
    </div>
  );

  const NavList = ({ onPick }: { onPick?: () => void }) => (
    <>
      {NAV.map((grp) => (
        <div key={grp.group}>
          <div className="nav-group-label mono-label">{grp.group}</div>
          {grp.items.map((it) => (
            <Link
              key={it.key}
              to={it.to}
              className={`nav-item${activeKey === it.key ? ' active' : ''}`}
              onClick={onPick}
            >
              <Icon name={it.icon} size={18} />
              <span>{it.label}</span>
              {it.live && liveCount > 0 && <span className="nav-badge">{liveCount} EN VIVO</span>}
            </Link>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <div className="app-bg">
      {isRouterLoading && (
        <div
          className="global-progress-bar"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
            backgroundSize: '200% 100%',
            animation: 'progress-bar-loading 1.5s infinite linear',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        />
      )}

      {isOffline && (
        <div
          className="offline-toast"
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20, 31, 52, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--gold-line)',
            color: 'var(--tx)',
            padding: '12px 18px',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            fontSize: '13px',
            fontWeight: 500,
            width: 'calc(100% - 32px)',
            maxWidth: '420px',
            boxSizing: 'border-box',
            animation: 'fade-in-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', flexShrink: 0 }}>
            <Icon name="close" size={12} />
          </div>
          <div style={{ flex: 1, lineHeight: '1.4' }}>
            <strong style={{ display: 'block', color: 'var(--tx)' }}>Modo sin conexión activo</strong>
            <span style={{ color: 'var(--tx-2)', display: 'block', fontSize: '11px', marginTop: '1px' }}>
              Tus predicciones se guardarán localmente y se sincronizarán al recuperar señal.
            </span>
          </div>
        </div>
      )}

      <div className="shell">
        <aside className="sidebar">
          <Brand />
          <nav className="nav">
            <NavList />
          </nav>
          <div className="sidebar-foot">
            FIFA World Cup 26 · datos abiertos.
            <br />
            No oficial · sin afiliación FIFA.
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button type="button" className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Menú">
              <Icon name="menu" size={18} />
            </button>
            <div>
              <h1>{TITLES[activeKey] ?? 'Panel'}</h1>
            </div>
            <form
              className="searchbox"
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
            >
              <Icon name="search" size={15} />
              <input
                aria-label="Buscar jugadores y clubes"
                placeholder="Buscar jugadores, clubes…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
            <span className="badge" style={{ alignSelf: 'center' }} title="Datos locales">
              <span className="dot-ok" />
              <span className="sb-text">Datos</span>
            </span>
            <Link to="/analyst" className="icon-btn" title="Analista IA">
              <Icon name="ai" size={18} />
            </Link>
            {!isLocalHost && (
              <button type="button" className="icon-btn logout-btn" title="Salir" onClick={logout}>
                <Icon name="arrowR" size={18} />
              </button>
            )}
          </header>

          <div className="content">
            {children}
            <footer
              style={{
                marginTop: 40,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--gold-line)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="mono-label" style={{ fontSize: 8.5, color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Socios de Gala FIFA 2026
                </span>
                <div
                  style={{
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.65,
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--tx-3)', fontFamily: 'sans-serif' }}>adidas</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, fontStyle: 'italic', color: 'var(--tx-3)', fontFamily: 'serif' }}>Coca-Cola</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--tx-3)' }}>HYUNDAI</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--tx-3)', fontStyle: 'italic' }}>VISA</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-3)', letterSpacing: '0.05em' }}>QATAR airways</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  width: '100%',
                }}
              >
                <span className="mono-label">{FOOTER_NOTICE}</span>
                <span className="mono-label">Calendario del Torneo</span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <nav className="mobile-nav">
        {MOBILE_KEYS.map((k) => {
          const it = ALL_ITEMS.find((x) => x.key === k);
          if (!it) return null;
          return (
            <Link key={k} to={it.to} className={`mi${activeKey === k ? ' active' : ''}`}>
              <Icon name={it.icon} size={21} />
              <span>{it.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      {drawer && (
        <>
          <div className="drawer-scrim" onClick={() => setDrawer(false)} />
          <div className="drawer">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Brand />
              <button type="button" className="icon-btn" style={{ margin: 14 }} onClick={() => setDrawer(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <nav className="nav">
              <NavList onPick={() => setDrawer(false)} />
            </nav>
            <div className="sidebar-foot">
              Private local dashboard.
              <br />
              Not for public distribution.
            </div>
          </div>
        </>
      )}

      <TweaksPanel />
    </div>
  );
}
