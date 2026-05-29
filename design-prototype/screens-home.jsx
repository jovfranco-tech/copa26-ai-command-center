/* screens-home.jsx — Home Dashboard (command center) */
(function () {
  const { useContext, useState } = React;
  const Icon = window.Icon, WC = window.WC;
  const { MatchCard, MatchRow, StatTile, Section, Crest, Flag, Form, Avatar, PlayerMini, fmtDay } = window;

  /* ---- Live ticker ---- */
  function Ticker({ onOpen }) {
    const today = WC.matchesByDate(WC.TODAY);
    const items = [...WC.MATCHES.filter((m) => m.status === "LIVE"), ...today.filter((m) => m.status !== "LIVE")].slice(0, 8);
    return (
      <div className="ticker">
        {items.map((m) => {
          const live = m.status === "LIVE";
          return (
            <div key={m.id} className={"tick" + (live ? " is-live" : "")} onClick={() => onOpen(m.id)}>
              <div className="tick-top">
                {live ? <span className="badge live"><span className="live-dot"></span>{m.minute}'</span> : <span className="mono-label" style={{ margin: 0 }}>{m.status === "FT" ? "FT" : m.time}</span>}
                <span className="mono-label" style={{ margin: 0 }}>Grp {m.group}</span>
              </div>
              <div className="tick-team"><Crest code={m.home} size={18} /><span>{m.home}</span><span className="num">{m.homeGoals ?? "–"}</span></div>
              <div className="tick-team" style={{ marginTop: 5 }}><Crest code={m.away} size={18} /><span>{m.away}</span><span className="num">{m.awayGoals ?? "–"}</span></div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ---- AI Match Brief (data-grounded, optional AI refresh) ---- */
  function brief() {
    const today = WC.matchesByDate(WC.TODAY);
    const live = WC.MATCHES.filter((m) => m.status === "LIVE");
    const venues = new Set(today.map((m) => m.venue)).size;
    const scorer = WC.topScorers(1)[0];
    const favGroup = WC.teamById["ESP"].group;
    const leader = WC.groupTable(favGroup)[0];
    const ft = WC.MATCHES.filter((m) => m.status === "FT");
    const big = [...ft].sort((a, b) => Math.abs(b.homeGoals - b.awayGoals) - Math.abs(a.homeGoals - a.awayGoals))[0];
    return [
      { t: <>Matchday 2 is underway — <span className="hl">{today.length} fixtures</span> today across {venues} venues{live.length ? <>, <span className="hl">{live.length} live</span> right now</> : ""}.</>, cite: "Today", to: ["matches"] },
      { t: <><span className="hl">{WC.teamById[leader.team].name}</span> top Group {favGroup} on {leader.Pts} pts (GD {leader.GD > 0 ? "+" : ""}{leader.GD}).</>, cite: "Group " + favGroup, to: ["standings", { group: favGroup }] },
      { t: <><span className="hl">{scorer.name}</span> leads the scoring charts with {scorer.goals} goals and {scorer.assists} assists.</>, cite: "Scorers", to: ["player", { id: scorer.id }] },
      { t: <>Biggest result so far: <span className="hl">{big.home} {big.homeGoals}–{big.awayGoals} {big.away}</span>.</>, cite: big.id, to: ["match", { id: big.id }] },
    ];
  }

  function AIBrief() {
    const ctx = useContext(AppCtx);
    const [pts] = useState(brief);
    const [ai, setAi] = useState(null);
    const [busy, setBusy] = useState(false);
    async function regen() {
      if (busy) return; setBusy(true);
      try {
        const ctxStr = pts.map((p, i) => `${i + 1}. ${typeof p.t === "string" ? p.t : ""}`).join("\n");
        const today = WC.matchesByDate(WC.TODAY).map((m) => `${m.home} ${m.homeGoals ?? "-"}-${m.awayGoals ?? "-"} ${m.away}`).join("; ");
        const prompt = `Write a 3-sentence executive brief of a World Cup matchday for a private dashboard, using ONLY this local data. Do not invent anything. Be concise and analytical.\nToday: ${today}\nTop scorer: ${WC.topScorers(1)[0].name} ${WC.topScorers(1)[0].goals} goals.`;
        if (window.claude && window.claude.complete) setAi((await window.claude.complete(prompt)).trim());
      } catch (e) {}
      setBusy(false);
    }
    return (
      <div className="card brief">
        <div className="card-hd"><span style={{ width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center", background: "var(--gold-soft)", color: "var(--gold)" }}><Icon name="ai" size={15} /></span><h3>AI Match Brief</h3>
          <span className="spacer"></span>
          <button className="btn ghost btn-sm" onClick={regen} disabled={busy}><Icon name="sparkSmall" size={13} />{busy ? "…" : "Regenerate"}</button>
        </div>
        <div className="card-pad brief-body">
          {ai
            ? <p style={{ margin: 0 }}>{ai}</p>
            : pts.map((p, i) => (
                <div key={i} className="brief-pt"><span className="dot"></span><span style={{ flex: 1 }}>{p.t}<span className="cite" onClick={() => ctx.nav(...p.to)}>{p.cite}</span></span></div>
              ))}
          <div className="mono-label" style={{ marginTop: 10 }}>Generated from local cached data · no external sources</div>
        </div>
      </div>
    );
  }

  /* ---- Local cache / sync ---- */
  function SyncCard() {
    const M = WC.META;
    return (
      <div className="card">
        <div className="card-hd"><span className="dot-ok"></span><h3>Local cache</h3><span className="spacer"></span><span className="badge gold">{M.cacheStatus}</span></div>
        <div className="card-pad" style={{ paddingTop: 4 }}>
          <div className="sync-row"><span className="k">Last sync</span><span className="num" style={{ fontSize: 12 }}>{M.lastSync}</span></div>
          <div className="sync-row"><span className="k">Database</span><span className="num" style={{ fontSize: 12 }}>{M.db}</span></div>
          <div className="sync-row"><span className="k">Cache size</span><span className="num" style={{ fontSize: 12 }}>{M.sizeMB} MB</span></div>
          <div className="sync-row"><span className="k">Assets loaded</span><span className="num" style={{ fontSize: 12 }}>{M.assets.crests} crests · {M.assets.photos} photos</span></div>
        </div>
      </div>
    );
  }

  /* ---- Favorite group mini-standings ---- */
  function GroupMini() {
    const ctx = useContext(AppCtx);
    const fav = ctx.favs.teams[0] || "ESP";
    const g = WC.teamById[fav].group;
    const rows = WC.groupTable(g);
    return (
      <div className="card">
        <div className="card-hd"><Icon name="standings" size={15} style={{ color: "var(--gold)" }} /><h3>Group {g}</h3><span className="spacer"></span><span className="card-link" onClick={() => ctx.nav("standings", { group: g })}>Full table</span></div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th style={{ width: 22 }}>#</th><th>Team</th><th className="center">P</th><th className="center">GD</th><th className="center">Pts</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.team} className={"clickable " + (i < 2 ? "r-adv" : "")} onClick={() => ctx.nav("team", { code: r.team })}>
                  <td><span className="row gap-6"><span className={"qualify-bar " + (i < 2 ? "q1" : i === 2 ? "q3" : "q0")}></span><span className="rank">{i + 1}</span></span></td>
                  <td><span className="row gap-8"><Crest code={r.team} size={20} /><span className="strong nowrap" style={{ fontSize: 12.5, fontWeight: r.team === fav ? 700 : 600 }}>{r.team}</span></span></td>
                  <td className="center num">{r.P}</td>
                  <td className={"center num " + (r.GD > 0 ? "gd-pos" : r.GD < 0 ? "gd-neg" : "")}>{r.GD > 0 ? "+" : ""}{r.GD}</td>
                  <td className="center num strong tx-gold">{r.Pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---- My Watchlist ---- */
  function Watchlist() {
    const ctx = useContext(AppCtx);
    const [tab, setTab] = useState("teams");
    const f = ctx.favs;
    return (
      <div className="card">
        <div className="card-hd"><Icon name="target" size={15} style={{ color: "var(--gold)" }} /><h3>My Watchlist</h3>
          <span className="spacer"></span>
          <div className="row gap-6">
            {[["teams", "Teams " + f.teams.length], ["players", "Players " + f.players.length], ["matches", "Matches " + f.matches.length]].map(([v, l]) =>
              <span key={v} className={"pill" + (tab === v ? " on" : "")} style={{ padding: "4px 9px", fontSize: 11.5 }} onClick={() => setTab(v)}>{l}</span>)}
          </div>
        </div>
        <div className="card-pad" style={{ paddingTop: 8 }}>
          {tab === "teams" && (f.teams.length ? <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
            {f.teams.map((c) => { const s = WC.STANDINGS[c]; return (
              <div key={c} className="row gap-8 clickable" style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }} onClick={() => ctx.nav("team", { code: c })}>
                <Crest code={c} size={26} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">{WC.teamById[c].name}</div><div className="mono-label" style={{ margin: 0 }}>{s.Pts} pts</div></div>
              </div>); })}
          </div> : <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Star teams to watch them here.</p>)}
          {tab === "players" && (f.players.length ? f.players.map((id) => { const p = WC.PLAYERS.find((x) => x.id === id); return p ? <PlayerMini key={id} p={p} onOpen={(pid) => ctx.nav("player", { id: pid })} metric={(x) => x.goals + "G"} /> : null; }) : <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Star players to watch them here.</p>)}
          {tab === "matches" && (f.matches.length ? f.matches.map((id) => { const m = WC.MATCHES.find((x) => x.id === id); return m ? <MatchRow key={id} m={m} onOpen={(mid) => ctx.nav("match", { id: mid })} /> : null; }) : <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Save matches from any fixture card.</p>)}
        </div>
      </div>
    );
  }

  function Home() {
    const ctx = useContext(AppCtx);
    const today = WC.matchesByDate(WC.TODAY);
    const live = WC.MATCHES.filter((m) => m.status === "LIVE");
    const upcoming = WC.MATCHES.filter((m) => m.status === "UPCOMING").slice(0, 5);
    const results = WC.MATCHES.filter((m) => m.status === "FT").slice(-6).reverse();
    const scorers = WC.topScorers(5);
    const played = WC.MATCHES.filter((m) => m.status === "FT").length;
    const goals = WC.MATCHES.filter((m) => m.status === "FT").reduce((s, m) => s + m.homeGoals + m.awayGoals, 0);
    const open = (id) => ctx.nav("match", { id });

    return (
      <div className="page-fade">
        {/* dense KPI strip */}
        <div className="stat-strip" style={{ marginBottom: 18 }}>
          <StatTile icon="ball" label="Goals" value={goals} sub="Tournament" trend={"+" + (goals % 9 + 4) + " today"} spark={[40, 55, 38, 70, 62, 90, 100]} />
          <StatTile icon="whistle" label="Played" value={played} sub={`of ${WC.MATCHES.length}`} />
          <StatTile icon="flame" label="Avg / match" value={(goals / Math.max(played, 1)).toFixed(2)} sub="Group stage" accent="var(--pos)" />
          <StatTile icon="target" label="Live now" value={live.length} sub={live.length ? "In play" : "None"} accent={live.length ? "var(--live)" : null} />
          <StatTile icon="star" label="Watchlist" value={ctx.favs.teams.length + ctx.favs.players.length} sub="Teams + players" />
        </div>

        <div className="home-grid">
          {/* main */}
          <div className="grid">
            <AIBrief />

            <Section title="Live & today" label="Ticker">
              <Ticker onOpen={open} />
            </Section>

            <Section title="Today's fixtures" label="19 Jun"
              action={<span className="card-link" onClick={() => ctx.nav("matches")}>Match Center <Icon name="chevR" size={13} /></span>}>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
                {today.slice(0, 4).map((m) => <MatchCard key={m.id} m={m} onOpen={open} />)}
              </div>
            </Section>

            <Watchlist />

            <Section title="Latest results" label="Full time">
              <div className="card card-pad">
                {results.map((m) => <MatchRow key={m.id} m={m} onOpen={open} />)}
              </div>
            </Section>
          </div>

          {/* persistent rail */}
          <div className="rail">
            <SyncCard />
            <GroupMini />
            <div className="card">
              <div className="card-hd"><Icon name="ball" size={15} style={{ color: "var(--gold)" }} /><h3>Top scorers</h3><span className="spacer"></span><span className="card-link" onClick={() => ctx.nav("stats")}>All</span></div>
              <div className="card-pad" style={{ paddingTop: 6 }}>
                {scorers.map((p, i) => <PlayerMini key={p.id} p={p} rank={i + 1} onOpen={(id) => ctx.nav("player", { id })} />)}
              </div>
            </div>
            <div className="card">
              <div className="card-hd"><Icon name="clock" size={15} style={{ color: "var(--gold)" }} /><h3>Upcoming</h3><span className="spacer"></span><span className="card-link" onClick={() => ctx.nav("matches")}>Schedule</span></div>
              <div className="card-pad" style={{ paddingTop: 4 }}>
                {upcoming.map((m) => <MatchRow key={m.id} m={m} onOpen={open} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  window.HomeScreen = Home;
})();
