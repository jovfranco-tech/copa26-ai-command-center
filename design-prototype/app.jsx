/* app.jsx — shell, navigation, routing, state, tweaks */
(function () {
  const { useState, useEffect, useCallback } = React;
  const Icon = window.Icon, WC = window.WC;
  const AppCtx = window.AppCtx;

  const NAV = [
    { group: "Command", items: [
      { key: "home", label: "Dashboard", icon: "home" },
      { key: "matches", label: "Match Center", icon: "calendar", live: true },
      { key: "bracket", label: "Bracket", icon: "bracket" },
    ]},
    { group: "Explore", items: [
      { key: "teams", label: "Teams", icon: "teams" },
      { key: "players", label: "Players", icon: "players" },
      { key: "standings", label: "Groups & Standings", icon: "standings" },
      { key: "stats", label: "Stats", icon: "stats" },
      { key: "venues", label: "Venues", icon: "venues" },
    ]},
    { group: "Personal", items: [
      { key: "favorites", label: "Favorites", icon: "star" },
      { key: "ai", label: "Match Analyst", icon: "ai" },
    ]},
  ];
  const TITLES = {
    home: "Dashboard", matches: "Match Center", bracket: "Knockout Bracket",
    teams: "Teams", players: "Players", standings: "Groups & Standings",
    stats: "Statistics", venues: "Venues", favorites: "Favorites", ai: "AI Match Analyst",
    match: "Match", team: "Team", player: "Player", venue: "Venue",
  };
  const MOBILE_NAV = ["home", "matches", "standings", "stats", "ai"];

  const FONT_PRESETS = {
    "Archivo": ['"Archivo", system-ui, sans-serif', '"JetBrains Mono", monospace'],
    "Space Grotesk": ['"Space Grotesk", system-ui, sans-serif', '"Space Mono", monospace'],
    "Hanken Grotesk": ['"Hanken Grotesk", system-ui, sans-serif', '"IBM Plex Mono", monospace'],
  };

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#c9a24b",
    "goldAmt": 30,
    "font": "Archivo",
    "density": "regular",
    "theme": "dark",
    "radius": 14
  }/*EDITMODE-END*/;

  function loadLS(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [stack, setStack] = useState([{ screen: "home", params: {} }]);
    const [drawer, setDrawer] = useState(false);
    const [favs, setFavs] = useState(() => loadLS("wc_favs", WC.FAV_DEFAULTS));
    const [notes, setNotesState] = useState(() => loadLS("wc_notes", ""));
    const [present, setPresent] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [presentIdx, setPresentIdx] = useState(0);
    const PLAYLIST = ["home", "standings", "bracket", "stats"];
    const PLAY_TITLES = { home: "Tournament Dashboard", standings: "Groups & Standings", bracket: "Knockout Bracket", stats: "Statistics" };
    const cur = stack[stack.length - 1];

    // apply tweaks to :root
    useEffect(() => {
      const r = document.documentElement;
      r.setAttribute("data-theme", t.theme);
      r.setAttribute("data-density", t.density);
      r.style.setProperty("--gold", t.accent);
      r.style.setProperty("--gold-2", t.accent);
      r.style.setProperty("--gold-amt", (t.goldAmt / 100).toFixed(2));
      r.style.setProperty("--r", t.radius + "px");
      r.style.setProperty("--r-sm", Math.max(4, t.radius - 5) + "px");
      const fp = FONT_PRESETS[t.font] || FONT_PRESETS["Archivo"];
      r.style.setProperty("--font-ui", fp[0]);
      r.style.setProperty("--font-num", fp[1]);
    }, [t]);

    useEffect(() => saveLS("wc_favs", favs), [favs]);
    useEffect(() => saveLS("wc_notes", notes), [notes]);
    useEffect(() => { window.scrollTo(0, 0); const c = document.querySelector(".content"); if (c) c.scrollTop = 0; }, [stack.length, cur.screen]);

    const nav = useCallback((screen, params = {}) => { setStack((s) => [...s, { screen, params }]); setDrawer(false); }, []);
    const back = useCallback(() => setStack((s) => s.length > 1 ? s.slice(0, -1) : s), []);
    const goTop = useCallback((screen, params = {}) => { setStack([{ screen, params }]); setDrawer(false); }, []);

    // presentation / kiosk mode
    useEffect(() => {
      document.documentElement.setAttribute("data-present", present ? "on" : "off");
      if (!present || !playing) return;
      const iv = setInterval(() => setPresentIdx((i) => (i + 1) % PLAYLIST.length), 11000);
      return () => clearInterval(iv);
    }, [present, playing]);
    useEffect(() => { if (present) goTop(PLAYLIST[presentIdx]); }, [presentIdx, present]);
    useEffect(() => {
      if (!present) return;
      const onKey = (e) => { if (e.key === "Escape") setPresent(false); else if (e.key === "ArrowRight") setPresentIdx((i) => (i + 1) % PLAYLIST.length); else if (e.key === "ArrowLeft") setPresentIdx((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length); else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); } };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [present]);
    const startPresent = useCallback(() => { setPresentIdx(0); setPlaying(true); setPresent(true); }, []);

    const isFav = useCallback((kind, id) => (favs[kind] || []).includes(id), [favs]);
    const toggleFav = useCallback((kind, id) => setFavs((f) => {
      const arr = f[kind] || [];
      return { ...f, [kind]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
    }), []);
    const setNotes = useCallback((v) => setNotesState(v), []);

    const ctxValue = { nav, back, goTop, favs, isFav, toggleFav, notes, setNotes };

    function renderScreen() {
      const p = cur.params;
      switch (cur.screen) {
        case "home": return <window.HomeScreen />;
        case "matches": return <window.MatchCenterScreen />;
        case "match": return <window.MatchDetailScreen id={p.id} />;
        case "bracket": return <window.BracketScreen />;
        case "teams": return <window.TeamsScreen />;
        case "team": return <window.TeamDetailScreen code={p.code} />;
        case "players": return <window.PlayersScreen />;
        case "player": return <window.PlayerDetailScreen id={p.id} />;
        case "standings": return <window.StandingsScreen group={p.group} />;
        case "stats": return <window.StatsScreen />;
        case "venues": return <window.VenuesScreen />;
        case "venue": return <window.VenueDetailScreen id={p.id} />;
        case "favorites": return <window.FavoritesScreen />;
        case "ai": return <window.AIScreen />;
        default: return <window.HomeScreen />;
      }
    }

    const activeRoot = ["match"].includes(cur.screen) ? "matches" : ["team"].includes(cur.screen) ? "teams" : ["player"].includes(cur.screen) ? "players" : ["venue"].includes(cur.screen) ? "venues" : cur.screen;
    const liveCount = WC.MATCHES.filter((m) => m.status === "LIVE").length;

    function Brand() {
      return (
        <div className="brand">
          <span className="brand-mark"><Icon name="trophy" size={20} /></span>
          <div>
            <div className="brand-name">World Cup</div>
            <div className="brand-sub">Command Center</div>
          </div>
        </div>
      );
    }
    function NavList({ onPick }) {
      return NAV.map((grp) => (
        <div key={grp.group}>
          <div className="nav-group-label mono-label">{grp.group}</div>
          {grp.items.map((it) => (
            <div key={it.key} className={"nav-item" + (activeRoot === it.key ? " active" : "")} onClick={() => onPick(it.key)}>
              <Icon name={it.icon} size={18} />
              <span>{it.label}</span>
              {it.live && liveCount > 0 && <span className="nav-badge">{liveCount} LIVE</span>}
            </div>
          ))}
        </div>
      ));
    }

    return (
      <AppCtx.Provider value={ctxValue}>
      {present && (
        <div className="present-bar">
          <span className="brand-mark" style={{ width: 30, height: 30 }}><Icon name="trophy" size={17} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="mono-label" style={{ margin: 0 }}>Presentation · {presentIdx + 1}/{PLAYLIST.length}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }} className="nowrap">{PLAY_TITLES[PLAYLIST[presentIdx]]}</div>
          </div>
          <div className="present-prog"><i style={{ width: ((presentIdx + 1) / PLAYLIST.length * 100) + "%" }}></i></div>
          <div className="row gap-8">
            <button className="icon-btn" onClick={() => setPresentIdx((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length)} title="Previous"><Icon name="arrowL" size={17} /></button>
            <button className="icon-btn" onClick={() => setPlaying((p) => !p)} title={playing ? "Pause" : "Play"}><Icon name={playing ? "pause" : "play"} size={16} /></button>
            <button className="icon-btn" onClick={() => setPresentIdx((i) => (i + 1) % PLAYLIST.length)} title="Next"><Icon name="arrowR" size={17} /></button>
            <button className="btn ghost btn-sm" onClick={() => setPresent(false)}><Icon name="close" size={14} /> Exit</button>
          </div>
        </div>
      )}
      <div className="app-bg">
        <div className="shell">
          {/* sidebar (desktop) */}
          <aside className="sidebar">
            <Brand />
            <nav className="nav"><NavList onPick={goTop} /></nav>
            <div className="sidebar-foot">Private local dashboard.<br />Not for public distribution.</div>
          </aside>

          {/* main */}
          <div className="main">
            <header className="topbar">
              <button className="icon-btn menu-btn" onClick={() => setDrawer(true)}><Icon name="menu" size={18} /></button>
              {stack.length > 1 && <button className="icon-btn" onClick={back}><Icon name="arrowL" size={18} /></button>}
              <div>
                <h1>{TITLES[cur.screen] || "Dashboard"}</h1>
              </div>
              <div className="searchbox" onClick={() => goTop("teams")}>
                <Icon name="search" size={15} />
                <span className="sb-text muted" style={{ fontSize: 13 }}>Search teams, players…</span>
              </div>
              <span className="badge" style={{ alignSelf: "center" }} title={"Last sync " + WC.META.lastSync}><span className="dot-ok"></span><span className="sb-text">Local cache</span></span>
              <button className="icon-btn" onClick={startPresent} title="Presentation mode"><Icon name="present" size={18} /></button>
              <button className="icon-btn" onClick={() => goTop("favorites")} title="Alerts"><Icon name="bell" size={18} /><span className="dot"></span></button>
            </header>

            <div className="content">
              {renderScreen()}
              <footer style={{ marginTop: 40, paddingTop: 18, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span className="mono-label">Private local dashboard · Not for public distribution</span>
                <span className="mono-label">Data shown is plausible/sample · no official affiliation</span>
              </footer>
            </div>
          </div>
        </div>

        {/* mobile bottom nav */}
        <nav className="mobile-nav">
          {MOBILE_NAV.map((k) => {
            const it = NAV.flatMap((g) => g.items).find((x) => x.key === k);
            return (
              <div key={k} className={"mi" + (activeRoot === k ? " active" : "")} onClick={() => goTop(k)}>
                <Icon name={it.icon} size={21} /><span>{it.label.split(" ")[0]}</span>
              </div>
            );
          })}
        </nav>

        {/* mobile drawer */}
        {drawer && (
          <>
            <div className="drawer-scrim" onClick={() => setDrawer(false)}></div>
            <div className="drawer">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Brand />
                <button className="icon-btn" style={{ margin: 14 }} onClick={() => setDrawer(false)}><Icon name="close" size={18} /></button>
              </div>
              <nav className="nav"><NavList onPick={goTop} /></nav>
              <div className="sidebar-foot">Private local dashboard.<br />Not for public distribution.</div>
            </div>
          </>
        )}

        {/* Tweaks */}
        <TweaksPanel title="Tweaks">
          <TweakSection label="Appearance" />
          <TweakRadio label="Theme" value={t.theme} options={["dark", "light"]} onChange={(v) => setTweak("theme", v)} />
          <TweakRadio label="Density" value={t.density} options={["compact", "regular", "comfy"]} onChange={(v) => setTweak("density", v)} />
          <TweakSlider label="Card radius" value={t.radius} min={4} max={22} unit="px" onChange={(v) => setTweak("radius", v)} />
          <TweakSection label="Accent" />
          <TweakColor label="Gold tone" value={t.accent} options={["#c9a24b", "#d8b15e", "#b8863a", "#cbb27a", "#c08a4e"]} onChange={(v) => setTweak("accent", v)} />
          <TweakSlider label="Gold intensity" value={t.goldAmt} min={0} max={100} unit="%" onChange={(v) => setTweak("goldAmt", v)} />
          <TweakSection label="Typography" />
          <TweakSelect label="Font" value={t.font} options={Object.keys(FONT_PRESETS)} onChange={(v) => setTweak("font", v)} />
        </TweaksPanel>
      </div>
      </AppCtx.Provider>
    );
  }

  // The screens use AppCtx via useContext — provide it at the root by wrapping.
  function Root() {
    return <App />;
  }
  window.__WCRoot = Root;
})();
