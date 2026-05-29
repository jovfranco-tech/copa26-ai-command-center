/* screens-players.jsx — Players list + Player detail */
(function () {
  const { useContext, useState, useMemo } = React;
  const Icon = window.Icon, WC = window.WC;
  const { PlayerCard, Avatar, Crest, Flag, FavStar, Empty, fmtFull } = window;

  function Players() {
    const ctx = useContext(AppCtx);
    const [pos, setPos] = useState("all");
    const [sort, setSort] = useState("goals");
    const [q, setQ] = useState("");
    let list = WC.PLAYERS.filter((p) =>
      (pos === "all" || p.pos === pos) &&
      (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || WC.teamById[p.team].name.toLowerCase().includes(q.toLowerCase()))
    );
    list = [...list].sort((a, b) => sort === "goals" ? b.goals - a.goals : sort === "assists" ? b.assists - a.assists : sort === "minutes" ? b.minutes - a.minutes : a.name.localeCompare(b.name));

    return (
      <div className="page-fade">
        <div className="row gap-10 wrap" style={{ marginBottom: 14 }}>
          <div className="searchbox" style={{ marginLeft: 0, maxWidth: 260 }}>
            <Icon name="search" size={15} />
            <input placeholder="Search players…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="row gap-6">
            {[["all", "All"], ["GK", "GK"], ["DF", "DF"], ["MF", "MF"], ["FW", "FW"]].map(([v, l]) =>
              <span key={v} className={"pill" + (pos === v ? " on" : "")} onClick={() => setPos(v)}>{l}</span>)}
          </div>
          <select className="pill right" value={sort} onChange={(e) => setSort(e.target.value)} style={{ appearance: "auto" }}>
            <option value="goals">Sort: Goals</option>
            <option value="assists">Sort: Assists</option>
            <option value="minutes">Sort: Minutes</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
        {list.length === 0 && <Empty icon="players" title="No players" text="No players match your filters." />}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
          {list.map((p, i) => <PlayerCard key={p.id} p={p} rank={sort === "goals" ? i + 1 : null} onOpen={(id) => ctx.nav("player", { id })} />)}
        </div>
      </div>
    );
  }

  /* ---- radar chart ---- */
  function Radar({ values, labels, color }) {
    const N = values.length, R = 78, cx = 110, cy = 100;
    const pt = (i, r) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
    const poly = values.map((v, i) => pt(i, R * v / 100).join(",")).join(" ");
    const rings = [0.33, 0.66, 1];
    return (
      <svg viewBox="0 0 220 200" width="100%" style={{ maxWidth: 280 }}>
        {rings.map((r, ri) => (
          <polygon key={ri} points={values.map((_, i) => pt(i, R * r).join(",")).join(" ")} fill="none" stroke="var(--line-2)" strokeWidth="1" />
        ))}
        {values.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />; })}
        <polygon points={poly} fill={color} fillOpacity="0.28" stroke={color} strokeWidth="2" />
        {values.map((v, i) => { const [x, y] = pt(i, R * v / 100); return <circle key={i} cx={x} cy={y} r="3" fill={color} />; })}
        {labels.map((l, i) => { const [x, y] = pt(i, R + 16); return <text key={i} x={x} y={y} fontSize="9" fontFamily="var(--font-num)" fill="var(--tx-3)" textAnchor="middle" dominantBaseline="middle">{l}</text>; })}
      </svg>
    );
  }

  function seedP(s, i) { const x = Math.sin((s.charCodeAt(1) + s.charCodeAt(3) + i * 9.7) * 1.7) * 10000; return x - Math.floor(x); }

  function attrsFor(p) {
    const base = { FW: [78, 60, 74, 80, 36, 62], MF: [58, 82, 76, 66, 62, 64], DF: [40, 66, 54, 60, 86, 80], GK: [18, 54, 28, 40, 70, 74] }[p.pos] || [60, 60, 60, 60, 60, 60];
    const adj = base.slice();
    adj[0] = Math.min(99, adj[0] + p.goals * 4);
    adj[1] = Math.min(99, adj[1] + p.assists * 4);
    adj[2] = Math.min(99, adj[2] + (p.goals + p.assists) * 2);
    adj[3] = Math.min(99, adj[3] + (p.minutes > 500 ? 3 : 0));
    return adj;
  }
  function pctRank(p, metric) {
    const peers = WC.PLAYERS.filter((x) => x.pos === p.pos);
    const v = metric(p);
    const below = peers.filter((x) => metric(x) <= v).length;
    return Math.round(below / peers.length * 100);
  }

  function PlayerDetail({ id }) {
    const ctx = useContext(AppCtx);
    const [tab, setTab] = useState("overview");
    const p = WC.PLAYERS.find((x) => x.id === id);
    if (!p) return <Empty icon="info" title="Player not found" />;
    const t = WC.teamById[p.team];
    const rankG = WC.topScorers(99).findIndex((x) => x.id === id) + 1;
    const stats = [
      ["Goals", p.goals, "ball"], ["Assists", p.assists, "sparkSmall"], ["Minutes", p.minutes, "clock"],
      ["G+A", p.goals + p.assists, "flame"], ["Yellow", p.yellow, "note"], ["Red", p.red, "note"],
    ];
    const radarLabels = ["FIN", "PAS", "DRB", "PAC", "DEF", "PHY"];
    const radar = useMemo(() => attrsFor(p), [id]);

    // shot map: goals first, then on-target, then off
    const shots = useMemo(() => {
      const total = p.goals * 2 + 5 + Math.floor(seedP(id, 0) * 4);
      const arr = [];
      for (let i = 0; i < total; i++) {
        const kind = i < p.goals ? "goal" : i < p.goals + Math.ceil(total * 0.35) ? "ontarget" : "off";
        // attacking third: y 4..40%, x spread, goals cluster centrally
        const cluster = kind === "goal" ? 0.5 : 1;
        const x = 50 + (seedP(id, i * 2 + 1) - 0.5) * (kind === "goal" ? 34 : 64);
        const y = 5 + seedP(id, i * 2 + 2) * (kind === "goal" ? 22 : 34);
        const sz = kind === "goal" ? 13 : 10;
        arr.push({ x, y, kind, sz, min: 5 + Math.floor(seedP(id, i + 30) * 85) });
      }
      return arr;
    }, [id]);
    const conv = Math.round(p.goals / Math.max(shots.length, 1) * 100);

    // heatmap cells weighted by position
    const heat = useMemo(() => {
      const rowsW = { FW: [1, 1, .8, .5, .3, .15], MF: [.4, .7, 1, 1, .7, .4], DF: [.15, .3, .5, .8, 1, .9], GK: [.05, .1, .2, .4, .8, 1] }[p.pos] || [.5, .6, .7, .7, .6, .5];
      const cells = [];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
        const edge = 1 - Math.abs(c - 2) * 0.18;
        const v = Math.min(1, rowsW[r] * edge * (0.6 + seedP(id, r * 5 + c) * 0.7));
        cells.push(v);
      }
      return cells;
    }, [id]);

    const pcts = [
      ["Goals", (x) => x.goals], ["Assists", (x) => x.assists], ["Goal contributions", (x) => x.goals + x.assists],
      ["Minutes", (x) => x.minutes], ["Discipline (fewer cards)", (x) => -(x.yellow * 1 + x.red * 3)],
    ];

    return (
      <div className="page-fade">
        <button className="btn ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => ctx.back()}><Icon name="arrowL" size={15} /> Back</button>
        <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
          <div className="card-pad" style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${t.colorA} 30%, transparent), transparent)` }}>
            <div className="row gap-16 wrap">
              <Avatar player={p} size={88} slot />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="row gap-8" style={{ alignItems: "center" }}>
                  <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{p.name}</span>
                  <span className={"pos-tag pos-" + p.pos} style={{ fontSize: 12 }}>{p.posLong}</span>
                </div>
                <div className="row gap-8 mono-label" style={{ marginTop: 4 }}>
                  <span className="clickable row gap-6" onClick={() => ctx.nav("team", { code: p.team })}><Flag code={p.team} size={13} />{t.name}</span>
                  <span>· {p.club}</span><span>· #{p.number}</span><span>· {p.age} yrs</span>
                </div>
              </div>
              <button className="btn gold btn-sm" onClick={() => ctx.toggleFav("players", p.id)}><Icon name="star" size={14} />{ctx.isFav("players", p.id) ? "Favorited" : "Favorite"}</button>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", marginBottom: 18 }}>
          {stats.map(([k, val, ic]) => (
            <div key={k} className="card stat-tile">
              <div className="stat-k"><span style={{ color: "var(--gold)" }}><Icon name={ic} size={15} /></span><span className="mono-label">{k}</span></div>
              <div className="stat-v" style={{ fontSize: 26 }}>{val}</div>
            </div>
          ))}
        </div>

        <div className="row gap-8 wrap" style={{ marginBottom: 16 }}>
          {[["overview", "Overview"], ["shots", "Shot map"], ["heat", "Heatmap"], ["pct", "Percentiles"]].map(([v, l]) =>
            <span key={v} className={"pill" + (tab === v ? " on" : "")} onClick={() => setTab(v)}>{l}</span>)}
        </div>

        {tab === "overview" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <div className="card">
              <div className="card-hd"><Icon name="target" size={15} style={{ color: "var(--gold)" }} /><h3>Player profile</h3><span className="spacer"></span><span className="mono-label" style={{ margin: 0 }}>vs {p.posLong}s</span></div>
              <div className="card-pad radar-wrap"><Radar values={radar} labels={radarLabels} color={t.colorA === "#ffffff" ? "var(--gold)" : t.colorA} /></div>
            </div>
            <div className="card">
              <div className="card-hd"><Icon name="stats" size={15} style={{ color: "var(--gold)" }} /><h3>Tournament ranking</h3></div>
              <div className="card-pad">
                {[["Goals", rankG, p.goals, WC.topScorers(1)[0].goals], ["Assists", WC.topAssists(99).findIndex((x) => x.id === id) + 1, p.assists, WC.topAssists(1)[0].assists || 1]].map(([k, rank, val, max]) => (
                  <div key={k} style={{ marginBottom: 14 }}>
                    <div className="row" style={{ justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span><b>{k}</b> <span className="muted">#{rank} overall</span></span>
                      <span className="num tx-gold" style={{ fontWeight: 700 }}>{val}</span>
                    </div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: (val / max * 100) + "%" }}></div></div>
                  </div>
                ))}
                <div className="divider"></div>
                <div className="row" style={{ justifyContent: "space-around", textAlign: "center" }}>
                  <div><div className="num" style={{ fontWeight: 700, fontSize: 20 }}>{conv}%</div><div className="mono-label">Conversion</div></div>
                  <div><div className="num" style={{ fontWeight: 700, fontSize: 20 }}>{(p.minutes / Math.max(p.goals, 1)).toFixed(0)}'</div><div className="mono-label">Min / goal</div></div>
                  <div><div className="num" style={{ fontWeight: 700, fontSize: 20 }}>{shots.length}</div><div className="mono-label">Shots</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "shots" && (
          <div className="card">
            <div className="card-hd"><Icon name="target" size={15} style={{ color: "var(--gold)" }} /><h3>Shot map</h3><span className="spacer"></span><span className="mono-label" style={{ margin: 0 }}>{p.goals} goals · {conv}% conversion</span></div>
            <div className="card-pad">
              <div className="vpitch">
                <div className="vlines"><span className="goal"></span><span className="box"></span><span className="sixb"></span><span className="arc"></span></div>
                {shots.map((s, i) => <span key={i} className={"shot " + s.kind} style={{ left: s.x + "%", top: s.y + "%", width: s.sz, height: s.sz }} title={`${s.kind} · ${s.min}'`}></span>)}
              </div>
              <div className="shot-legend">
                <span><span className="shot goal" style={{ position: "static", width: 12, height: 12, transform: "none" }}></span>Goal ({p.goals})</span>
                <span><span className="shot ontarget" style={{ position: "static", width: 12, height: 12, transform: "none" }}></span>On target</span>
                <span><span className="shot off" style={{ position: "static", width: 12, height: 12, transform: "none" }}></span>Off target</span>
              </div>
            </div>
          </div>
        )}

        {tab === "heat" && (
          <div className="card">
            <div className="card-hd"><Icon name="flame" size={15} style={{ color: "var(--gold)" }} /><h3>Average position heatmap</h3><span className="spacer"></span><span className="mono-label" style={{ margin: 0 }}>{p.posLong}</span></div>
            <div className="card-pad">
              <div className="vpitch">
                <div className="heatgrid">
                  {heat.map((v, i) => <i key={i} style={{ background: `radial-gradient(circle at center, color-mix(in srgb, var(--gold) ${Math.round(v * 85)}%, transparent), transparent 72%)` }}></i>)}
                </div>
                <div className="vlines"><span className="goal"></span><span className="box"></span><span className="arc"></span></div>
              </div>
              <p className="muted" style={{ fontSize: 11.5, textAlign: "center", marginTop: 12, marginBottom: 0 }}>Attacking direction is upward. Intensity reflects time spent in each zone.</p>
            </div>
          </div>
        )}

        {tab === "pct" && (
          <div className="card">
            <div className="card-hd"><Icon name="stats" size={15} style={{ color: "var(--gold)" }} /><h3>Percentile vs {p.posLong}s</h3></div>
            <div className="card-pad">
              {pcts.map(([label, metric]) => {
                const pr = pctRank(p, metric);
                const cls = pr >= 75 ? "hi" : pr >= 40 ? "mid" : "lo";
                return (
                  <div key={label} className="pct-row">
                    <span className="pct-label">{label}</span>
                    <div className="pct-track"><div className={"pct-fill " + cls} style={{ width: pr + "%" }}></div></div>
                    <span className="pct-val">{pr}<span className="muted" style={{ fontSize: 9 }}>th</span></span>
                  </div>
                );
              })}
              <p className="muted" style={{ fontSize: 11.5, marginTop: 8, marginBottom: 0 }}>Percentile rank against all {WC.PLAYERS.filter((x) => x.pos === p.pos).length} {p.posLong.toLowerCase()}s in the tournament pool.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  window.PlayersScreen = Players;
  window.PlayerDetailScreen = PlayerDetail;
})();
