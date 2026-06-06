import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Icon, type IconName } from '@worldcup/ui';
import { useMatches, useLiveOverlaySync, usePWAInstall } from '@/hooks';
import { useT } from '@/i18n';
import { usePreferences, applyPreferences, isThemeExplicit, setSystemThemePreference, type AppRole } from '@/store/preferences';
import { usePlayerFilters } from '@/store/filters';
import { TweaksPanel } from './TweaksPanel';
import { LanguageToggle } from './LanguageToggle';
import { NotificationToastStack } from './NotificationToast';

type StaticPath =
  | '/'
  | '/matches'
  | '/tv'
  | '/bracket'
  | '/teams'
  | '/players'
  | '/standings'
  | '/stats'
  | '/venues'
  | '/favorites'
  | '/pool'
  | '/data'
  | '/analyst'
  | '/estadio-3d';

interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  to: StaticPath;
  live?: boolean;
}

// `group` and `label` hold i18n keys, resolved with t() at render time.
const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'nav.groupCommand',
    items: [
      { key: 'home', label: 'nav.home', icon: 'home', to: '/' },
      { key: 'matches', label: 'nav.matches', icon: 'calendar', to: '/matches', live: true },
      { key: 'tv', label: 'nav.tv', icon: 'present', to: '/tv' },
      { key: 'bracket', label: 'nav.bracket', icon: 'bracket', to: '/bracket' },
    ],
  },
  {
    group: 'nav.groupExplore',
    items: [
      { key: 'teams', label: 'nav.teams', icon: 'teams', to: '/teams' },
      { key: 'players', label: 'nav.players', icon: 'players', to: '/players' },
      { key: 'standings', label: 'nav.standings', icon: 'standings', to: '/standings' },
      { key: 'stats', label: 'nav.stats', icon: 'stats', to: '/stats' },
      { key: 'estadio-3d', label: 'nav.stadium', icon: 'route', to: '/estadio-3d' },
      { key: 'venues', label: 'nav.venues', icon: 'venues', to: '/venues' },
    ],
  },
  {
    group: 'nav.groupPersonal',
    items: [
      { key: 'pool', label: 'nav.pool', icon: 'trophy', to: '/pool' },
      { key: 'favorites', label: 'nav.favorites', icon: 'star', to: '/favorites' },
      { key: 'data', label: 'nav.data', icon: 'cloud', to: '/data' },
      { key: 'analyst', label: 'nav.analyst', icon: 'ai', to: '/analyst' },
    ],
  },
];

const MOBILE_KEYS = ['home', 'matches', 'pool', 'standings', 'analyst'];
const ALL_ITEMS = NAV.flatMap((g) => g.items);

const TITLES: Record<string, string> = {
  home: 'titles.home',
  matches: 'titles.matches',
  tv: 'titles.tv',
  bracket: 'titles.bracket',
  teams: 'titles.teams',
  players: 'titles.players',
  standings: 'titles.standings',
  stats: 'titles.stats',
  venues: 'titles.venues',
  favorites: 'titles.favorites',
  pool: 'titles.pool',
  data: 'titles.data',
  analyst: 'titles.analyst',
  'estadio-3d': 'titles.stadium',
};

function activeKeyFromPath(pathname: string): string {
  if (pathname === '/') return 'home';
  const seg = pathname.split('/')[1] ?? 'home';
  return seg || 'home';
}

export function AppShell({ children }: { children: ReactNode }) {
  useLiveOverlaySync(); // prime + keep the live results/lineups overlay in sync
  const t = useT();
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

  // Follow system color-scheme changes when user hasn't explicitly chosen a theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => {
      if (!isThemeExplicit()) {
        setSystemThemePreference(e.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const roleLabel = t(`role.${prefs.role}`);

  const { data: liveData } = useMatches({ status: 'LIVE' });
  const liveCount = liveData?.items.length ?? 0;
  const { canInstall, promptInstall } = usePWAInstall();

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
      <img className="brand-mark" src="/brand/fwc26-emblem.svg" alt="Copa 2026" />
      <div className="brand-copy">
        <img className="brand-wordmark" src="/brand/fwc26-stacked-wordmark.svg" alt="Copa 2026" />
        <div className="brand-sub">
          <span>{t('nav.groupCommand')}</span>
        </div>
      </div>
    </div>
  );

  const NavList = ({ onPick }: { onPick?: () => void }) => (
    <>
      {NAV.map((grp) => (
        <div key={grp.group}>
          <div className="nav-group-label mono-label">{t(grp.group)}</div>
          {grp.items.map((it) => (
            <Link
              key={it.key}
              to={it.to}
              className={`nav-item${activeKey === it.key ? ' active' : ''}`}
              onClick={onPick}
            >
              <Icon name={it.icon} size={18} />
              <span>{t(it.label)}</span>
              {it.live && liveCount > 0 && <span className="nav-badge">{liveCount} {t('common.live')}</span>}
            </Link>
          ))}
        </div>
      ))}
    </>
  );

  // Aloria attribution badge — fixed bottom-right on desktop (always visible,
  // left of the Tweaks FAB), in the footer on mobile (where the bottom bar lives).
  const AloriaBadge = ({ fixed }: { fixed?: boolean }) => (
    <a
      href="https://www.aloria.mx"
      target="_blank"
      rel="noopener noreferrer"
      className={`aloria-badge${fixed ? ' aloria-badge--fixed' : ''}`}
      aria-label={t('footer.aloriaVisit')}
    >
      <span className="aloria-badge-by">{t('footer.aloriaBy')}</span>
      <span className="aloria-badge-cta">
        <span aria-hidden="true">↗</span> {t('footer.aloriaVisit')}
      </span>
    </a>
  );

  return (
    <div className="app-bg">
      <a href="#main-content" className="skip-to-content">{t('common.skipToContent')}</a>
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
            <strong style={{ display: 'block', color: 'var(--tx)' }}>{t('states.offlineTitle')}</strong>
            <span style={{ color: 'var(--tx-2)', display: 'block', fontSize: '11px', marginTop: '1px' }}>
              {t('states.offlineBody')}
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
            {canInstall && (
              <button
                type="button"
                className="pwa-install-btn"
                onClick={promptInstall}
              >
                <Icon name="download" size={14} /> {t('common.installApp')}
              </button>
            )}
            {t('footer.brand')}
            <br />
            {t('footer.tagline')}
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button type="button" className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label={t('common.menu')}>
              <Icon name="menu" size={18} />
            </button>
            <div>
              <h1>{t(TITLES[activeKey] ?? 'titles.home')}</h1>
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
                aria-label={t('common.search')}
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
            <span className="badge" style={{ alignSelf: 'center' }} title={t('common.dataBadge')}>
              <span className="dot-ok" />
              <span className="sb-text">{t('common.dataBadge')}</span>
            </span>
            <LanguageToggle />
            <select
              className="role-switch"
              value={prefs.role}
              aria-label={t('role.label')}
              title={`${t('role.active')}: ${roleLabel}`}
              onChange={(e) => prefs.set('role', e.target.value as AppRole)}
            >
              <option value="admin">{t('role.admin')}</option>
              <option value="family">{t('role.family')}</option>
              <option value="guest">{t('role.guest')}</option>
            </select>
            <Link to="/analyst" className="icon-btn" title={t('nav.analyst')} aria-label={t('nav.analyst')}>
              <Icon name="ai" size={18} />
            </Link>
            {!isLocalHost && (
              <button type="button" className="icon-btn logout-btn" title={t('common.logout')} aria-label={t('common.logout')} onClick={logout}>
                <Icon name="arrowR" size={18} />
              </button>
            )}
          </header>

          <div className="content" id="main-content">
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
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  width: '100%',
                }}
              >
                <span className="mono-label">{t('disclaimer.footer')}</span>
                <span className="mono-label">{t('footer.calendar')}</span>
              </div>

              {/* Aloria attribution badge — shown here on mobile (the fixed
                  desktop badge is hidden on small screens to clear the bottom bar) */}
              <div className="aloria-footer-wrap">
                <AloriaBadge />
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
              <span>{t(it.label).split(' ')[0]}</span>
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
              {t('footer.privateNote')}
              <br />
              {t('footer.notForDistribution')}
            </div>
          </div>
        </>
      )}

      <TweaksPanel />
      <AloriaBadge fixed />
      <NotificationToastStack />
    </div>
  );
}
