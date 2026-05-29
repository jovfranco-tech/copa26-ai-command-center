/* screens-stats.jsx — Tournament stats data product */
(function () {
  const { useContext, useState, useMemo } = React;
  const Icon = window.Icon, WC = window.WC;
  const { Avatar, Crest, Flag, Section } = window;

  function PlayerBoard({ title, icon, metric, fmt }) {
    const ctx = useContext(AppCtx);
    const list = [...WC.PLAYERS].sort((a, b) => metric(b) - metric(a)).slice(0, 8);
    const max = metric(list[0]) || 1;
    return (
      <div className="card">
        <div className="card-hd"><Icon name={icon} size={15} style={{ color: "var(--gold)" }} /><h3>{title}</h3></div>
        <div className="card-pad" style={{ paddingTop: 8 }}>
          {list.map((p, i) => (
            <div key={p.id} className="row gap-10 clickable" style={{ padding: "7px 0", borderBottom: i < 7 ? "1px solid var(--line)" : "none" }} onClick={() => ctx.nav("player", { id: p.id })}>
              <span className="num muted" style={{ width: 16, fontWeight: 700 }}>{i + 1}</span>
              <Avatar player={p} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">{p.name}</div>
                <div className="row gap-6"><div className="bar-track" style={{ width: 76 }}><div className="bar-fill" style={{ width: (metric(p) / max * 100) + "%" }}></div></div><span className="mono-label" style={{ margin: 0 }}>{p.team}</span></div>
              </div>
              <span className="num tx-gold" style={{ fontWeight: 700, fontSize: 15 }}>{fmt ? fmt(p) : metric(p)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function GKBoard({ title, icon, metric, fmt }) {
    const ctx = useContext(AppCtx);
    const list = [...WC.GOALKEEPERS].sort((a, b) => metric(b) - metric(a)).slice(0, 8);
    const max = metric(list[0]) || 1;
    return (
      <div className="card">
        <div className="card-hd"><Icon name={icon} size={15} style={{ color: "var(--gold)" }} /><h3>{title}</h3></div>
        <div className="card-pad" style={{ paddingTop: 8 }}>
          {list.map((g, i) => (
            <div key={g.id} className="row gap-10 clickable" style={{ padding: "7px 0", borderBottom: i < 7 ? "1px solid var(--line)" : "none" }} onClick={() => ctx.nav("team", { code: g.team })}>
              <span className="num muted" style={{ width: 16, fontWeight: 700 }}>{i + 1}</span>
              <Crest code={g.team} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">{g.name}</div>
                <div className="row gap-6"><div className="bar-track" style={{ width: 76 }}><div className="bar-fill" style={{ width: (metric(g) / max * 100) + "%" }}></div></div><span className="mono-label" style={{ margin: 0 }}>{g.team}</span></div>
              </div>
              <span className="num tx-gold" style={{ fontWeight: 700, fontSize: 15 }}>{fmt ? fmt(g) : metric(g)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function teamAggregates() {
    const agg = {};
    WC.TEAMS.forEach((t) => (agg[t.id] = { team: t.id, goals: WC.STANDINGS[t.id].GF, ga: WC.STANDINGS[t.id].GA, poss: [], shots: 0, n: 0 }));
    WC.MATCHES.filter((m) => m.status !== "UPCOMING").forEach((m) => {
      if (m.possH != null) { agg[m.home].poss.push(m.possH); agg[m.away].poss.push(100 - m.possH); }
      if (m.shotsH != null) { agg[m.home].shots += m.shotsH; agg[m.away].shots += m.shotsA; }
      agg[m.home].n++; agg[m.away].n++;
    });
    Object.values(agg).forEach((a) => { a.possAvg = a.poss.length ? Math.round(a.poss.reduce((x, y) => x + y, 0) / a.poss.length) : 0; a.shotsAvg = a.n ? (a.shots / a.n).toFixed(1) : 0; });
    return agg;
  }

  function TeamBoard({ title, icon, agg, metric, fmt }) {
    const ctx = useContext(AppCtx);
    const list = Object.values(agg).sort((a, b) => metric(b) - metric(a)).slice(0, 8);
    const max = metric(list[0]) || 1;
    return (
      <div className="card">
        <div className="card-hd"><Icon name={icon} size={15} style={{ color: "var(--gold)" }} /><h3>{title}</h3></div>
        <div className="card-pad" style={{ paddingTop: 8 }}>
          {list.map((a, i) => (
            <div key={a.team} className="row gap-10 clickable" style={{ padding: "7px 0", borderBottom: i < 7 ? "1px solid var(--line)" : "none" }} onClick={() => ctx.nav("team", { code: a.team })}>
              <span className="num muted" style={{ width: 16, fontWeight: 700 }}>{i + 1}</span>
              <Crest code={a.team} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">{WC.teamById[a.team].name}</div>
                <div className="bar-track" style={{ width: 110, marginTop: 3 }}><div className="bar-fill" style={{ width: (metric(a) / max * 100) + "%" }}></div></div>
              </div>
              <span className="num tx-gold" style={{ fontWeight: 700, fontSize: 15 }}>{fmt ? fmt(a) : metric(a)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function Compare() {
    const [a, setA] = useState("ARG");
    const [b, setB] = useState("FRA");
    const sa = WC.STANDINGS[a], sb = WC.STANDINGS[b];
    const ga = WC.playersByTeam(a).reduce((x, p) => x + p.goals, 0);
    const gb = WC.playersByTeam(b).reduce((x, p) => x + p.goals, 0);
    const rows = [
      ["Points", sa.Pts, sb.Pts], ["Goals for", sa.GF, sb.GF], ["Goals against", sb.GA, sa.GA, true],
      ["Goal diff", sa.GD, sb.GD], ["Wins", sa.W, sb.W], ["Squad goals", ga, gb], ["FIFA rank", WC.teamById[b].ranking, WC.teamById[a].ranking, true],
    ];
    return (
      <div className="card">
        <div className="card-hd"><Icon name="swap" size={15} style={{ color: "var(--gold)" }} /><h3>Head-to-head comparison</h3></div>
        <div className="card-pad">
          <div className="row gap-12" style={{ justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div className="row gap-10" style={{ marginBottom: 8 }}><Crest code={a} size={40} /><span style={{ fontWeight: 700 }}>{WC.teamById[a].name}</span></div>
              <select className="pill" value={a} onChange={(e) => setA(e.target.value)} style={{ appearance: "auto", width: "100%" }}>{WC.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </div>
            <span className="num muted" style={{ fontWeight: 700, alignSelf: "center" }}>VS</span>
            <div style={{ flex: 1, textAlign: "right" }}>
              <div className="row gap-10" style={{ marginBottom: 8, justifyContent: "flex-end" }}><span style={{ fontWeight: 700 }}>{WC.teamById[b].name}</span><Crest code={b} size={40} /></div>
              <select className="pill" value={b} onChange={(e) => setB(e.target.value)} style={{ appearance: "auto", width: "100%" }}>{WC.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </div>
          </div>
          {rows.map(([label, va, vb, inv]) => {
            const aWin = inv ? va < vb : va > vb, bWin = inv ? vb < va : vb > va;
            const tot = Math.abs(va) + Math.abs(vb) || 1, pa = Math.round(Math.abs(va) / tot * 100);
            return (
              <div key={label} style={{ marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span className="num" style={{ fontWeight: 700, color: aWin ? "var(--gold-2)" : "var(--tx-2)" }}>{va}</span>
                  <span className="mono-label" style={{ margin: 0 }}>{label}</span>
                  <span className="num" style={{ fontWeight: 700, color: bWin ? "var(--gold-2)" : "var(--tx-2)" }}>{vb}</span>
                </div>
                <div className="vs-bar"><div className="track" style={{ gridColumn: "1 / -1" }}>
                  <i style={{ width: pa + "%", background: aWin ? "var(--gold)" : "var(--bg-hover)" }}></i>
                  <i style={{ width: (100 - pa) + "%", background: bWin ? "var(--gold)" : "var(--bg-hover)" }}></i>
                </div></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function Stats() {
    const [seg, setSeg] = useState("players");
    const agg = useMemo(teamAggregates, []);
    const played = WC.MATCHES.filter((m) => m.status === "FT");
    const goals = played.reduce((s, m) => s + m.homeGoals + m.awayGoals, 0);
    const cards = WC.PLAYERS.reduce((s, p) => s + p.yellow + p.red, 0);
    const saves = WC.GOALKEEPERS.reduce((s, g) => s + g.saves, 0);
    const cleanSheets = WC.GOALKEEPERS.reduce((s, g) => s + g.cleanSheets, 0);
    const avgPoss = Math.round(Object.values(agg).reduce((s, a) => s + a.possAvg, 0) / WC.TEAMS.length);

    const KPIS = [
      ["Total goals", goals, "ball"], ["Matches", played.length, "whistle"], ["Goals / match", (goals / Math.max(played.length, 1)).toFixed(2), "flame"],
      ["Saves", saves, "shield"], ["Clean sheets", cleanSheets, "target"], ["Cards", cards, "note"], ["Avg possession", avgPoss + "%", "stats"],
    ];
    return (
      <div className="page-fade">
        <Section title="Tournament overview" label="KPIs">
          <div className="kpi-grid">
            {KPIS.map(([k, v, ic]) => (
              <div key={k} className="card stat-tile"><div className="stat-k"><span style={{ color: "var(--gold)" }}><Icon name={ic} size={15} /></span><span className="mono-label">{k}</span></div><div className="stat-v" style={{ fontSize: 26 }}>{v}</div></div>
            ))}
          </div>
        </Section>

        <div className="row gap-8 wrap" style={{ marginBottom: 16 }}>
          {[["players", "Players"], ["keepers", "Goalkeepers"], ["teams", "Teams"], ["compare", "Compare"]].map(([v, l]) =>
            <span key={v} className={"pill" + (seg === v ? " on" : "")} onClick={() => setSeg(v)}>{l}</span>)}
        </div>

        {seg === "players" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
            <PlayerBoard title="Top scorers" icon="ball" metric={(p) => p.goals} />
            <PlayerBoard title="Top assists" icon="sparkSmall" metric={(p) => p.assists} />
            <PlayerBoard title="Goal contributions" icon="flame" metric={(p) => p.goals + p.assists} />
            <PlayerBoard title="Most minutes" icon="clock" metric={(p) => p.minutes} fmt={(p) => p.minutes + "'"} />
            <PlayerBoard title="Most booked" icon="note" metric={(p) => p.yellow * 1 + p.red * 3} fmt={(p) => p.yellow + "Y" + (p.red ? " " + p.red + "R" : "")} />
          </div>
        )}
        {seg === "keepers" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
            <GKBoard title="Most saves" icon="shield" metric={(g) => g.saves} />
            <GKBoard title="Clean sheets" icon="target" metric={(g) => g.cleanSheets} />
          </div>
        )}
        {seg === "teams" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
            <TeamBoard title="Goals scored" icon="ball" agg={agg} metric={(a) => a.goals} />
            <TeamBoard title="Avg possession" icon="stats" agg={agg} metric={(a) => a.possAvg} fmt={(a) => a.possAvg + "%"} />
            <TeamBoard title="Shots / match" icon="target" agg={agg} metric={(a) => parseFloat(a.shotsAvg)} fmt={(a) => a.shotsAvg} />
            <TeamBoard title="Best defense" icon="shield" agg={agg} metric={(a) => -a.ga} fmt={(a) => a.ga + " GA"} />
          </div>
        )}
        {seg === "compare" && <Compare />}
      </div>
    );
  }
  window.StatsScreen = Stats;
})();
