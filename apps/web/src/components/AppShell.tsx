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
    group: 'Command',
    items: [
      { key: 'home', label: 'Dashboard', icon: 'home', to: '/' },
      { key: 'matches', label: 'Match Center', icon: 'calendar', to: '/matches', live: true },
      { key: 'bracket', label: 'Bracket', icon: 'bracket', to: '/bracket' },
    ],
  },
  {
    group: 'Explore',
    items: [
      { key: 'teams', label: 'Teams', icon: 'teams', to: '/teams' },
      { key: 'players', label: 'Players', icon: 'players', to: '/players' },
      { key: 'standings', label: 'Groups & Standings', icon: 'standings', to: '/standings' },
      { key: 'stats', label: 'Stats', icon: 'stats', to: '/stats' },
      { key: 'venues', label: 'Venues', icon: 'venues', to: '/venues' },
    ],
  },
  {
    group: 'Personal',
    items: [
      { key: 'favorites', label: 'Favorites', icon: 'star', to: '/favorites' },
      { key: 'analyst', label: 'Match Analyst', icon: 'ai', to: '/analyst' },
    ],
  },
];

const MOBILE_KEYS = ['home', 'matches', 'standings', 'stats', 'analyst'];
const ALL_ITEMS = NAV.flatMap((g) => g.items);

const TITLES: Record<string, string> = {
  home: 'Dashboard',
  matches: 'Match Center',
  bracket: 'Knockout Bracket',
  teams: 'Teams',
  players: 'Players',
  standings: 'Groups & Standings',
  stats: 'Statistics',
  venues: 'Venues',
  favorites: 'Favorites',
  analyst: 'AI Match Analyst',
};

function activeKeyFromPath(pathname: string): string {
  if (pathname === '/') return 'home';
  const seg = pathname.split('/')[1] ?? 'home';
  return seg || 'home';
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeKey = activeKeyFromPath(pathname);
  const [drawer, setDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const Brand = () => (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="trophy" size={20} />
      </span>
      <div>
        <div className="brand-name">World Cup</div>
        <div className="brand-sub">Command Center</div>
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
              {it.live && liveCount > 0 && <span className="nav-badge">{liveCount} LIVE</span>}
            </Link>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <div className="app-bg">
      <div className="shell">
        <aside className="sidebar">
          <Brand />
          <nav className="nav">
            <NavList />
          </nav>
          <div className="sidebar-foot">
            Private local dashboard.
            <br />
            Not for public distribution.
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button type="button" className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Menu">
              <Icon name="menu" size={18} />
            </button>
            <div>
              <h1>{TITLES[activeKey] ?? 'Dashboard'}</h1>
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
                aria-label="Search players and clubs"
                placeholder="Search players, clubs…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
            <span className="badge" style={{ alignSelf: 'center' }} title="Local cache">
              <span className="dot-ok" />
              <span className="sb-text">Local cache</span>
            </span>
            <Link to="/analyst" className="icon-btn" title="Match Analyst">
              <Icon name="ai" size={18} />
            </Link>
          </header>

          <div className="content">
            {children}
            <footer
              style={{
                marginTop: 40,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <span className="mono-label">{FOOTER_NOTICE}</span>
              <span className="mono-label">Data shown is plausible/sample · no official affiliation</span>
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
