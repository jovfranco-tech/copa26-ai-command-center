/* screens-matches.jsx — Match Center + Match detail */
(function () {
  const { useContext, useState, useMemo } = React;
  const Icon = window.Icon, WC = window.WC;
  const { MatchCard, Crest, Flag, StatusBadge, Section, Empty, Avatar, FavStar, Form, fmtFull } = window;

  /* ---------------- Match Center ---------------- */
  function MatchCenter() {
    const ctx = useContext(AppCtx);
    const [group, setGroup] = useState("all");
    const [stage, setStage] = useState("all");
    const [team, setTeam] = useState("all");
    const [day, setDay] = useState("all");

    const dates = useMemo(() => [...new Set(WC.MATCHES.map((m) => m.date))].sort(), []);
    const filtered = WC.MATCHES.filter((m) =>
      (group === "all" || m.group === group) &&
      (stage === "all" || (stage === "live" ? m.status === "LIVE" : stage === "upcoming" ? m.status === "UPCOMING" : m.status === "FT")) &&
      (team === "all" || m.home === team || m.away === team) &&
      (day === "all" || m.date === day)
    );
    const byDate = {};
    filtered.forEach((m) => { (byDate[m.date] = byDate[m.date] || []).push(m); });
    const orderedDates = Object.keys(byDate).sort();

    return (
      <div className="page-fade">
        {/* filter bar */}
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <div className="row gap-8 wrap" style={{ marginBottom: 12 }}>
            <span className="pill" style={{ pointerEvents: "none", borderColor: "transparent", paddingLeft: 0 }}><Icon name="filter" size={14} /> Filters</span>
            {[["all", "All stages"], ["live", "Live"], ["upcoming", "Upcoming"], ["ft", "Finished"]].map(([v, l]) =>
              <span key={v} className={"pill" + (stage === v ? " on" : "")} onClick={() => setStage(v)}>{l}</span>)}
          </div>
          <div className="scroll-x" style={{ marginBottom: 10 }}>
            <div className="row gap-6 nowrap">
              <span className={"pill" + (group === "all" ? " on" : "")} onClick={() => setGroup("all")}>All groups</span>
              {WC.GROUP_LETTERS.map((g) => <span key={g} className={"pill" + (group === g ? " on" : "")} onClick={() => setGroup(g)}>Group {g}</span>)}
            </div>
          </div>
          <div className="row gap-10 wrap">
            <select className="pill" value={team} onChange={(e) => setTeam(e.target.value)} style={{ appearance: "auto" }}>
              <option value="all">All teams</option>
              {WC.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="pill" value={day} onChange={(e) => setDay(e.target.value)} style={{ appearance: "auto" }}>
              <option value="all">All dates</option>
              {dates.map((d) => <option key={d} value={d}>{fmtFull(d)}</option>)}
            </select>
            <span className="right mono-label">{filtered.length} matches</span>
          </div>
        </div>

        {orderedDates.length === 0 && <Empty icon="calendar" title="No matches found" text="Try adjusting your filters to see more fixtures." />}
        {orderedDates.map((d) => (
          <div key={d} style={{ marginBottom: 26 }}>
            <div className="section-title">
              <span className="mono-label">{d === WC.TODAY ? "Today" : ""}</span>
              <h2>{fmtFull(d)}</h2>
              <span className="right mono-label">{byDate[d].length} fixtures</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
              {byDate[d].map((m) => <MatchCard key={m.id} m={m} onOpen={(id) => ctx.nav("match", { id })} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---------------- Match detail (deep) ---------------- */
  const FORMATION = ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW"];
  function lineupFor(code) {
    const pool = WC.playersByTeam(code);
    return FORMATION.map((pos, i) => {
      const real = pool[i];
      return real ? { ...real, slot: pos } : { id: code + i, name: code + " #" + (i + 2), pos, slot: pos, number: i + 2, team: code };
    });
  }
  // pitch coordinates for 4-3-3 (home = left side, away mirrored)
  const POS_X = { GK: 6, DF: 19, MF: 33, FW: 45 };
  const ROWS = { GK: [50], DF: [18, 39, 61, 82], MF: [28, 50, 72], FW: [28, 50, 72] };
  function placed(code, mirror) {
    const lu = lineupFor(code);
    const idx = { GK: 0, DF: 0, MF: 0, FW: 0 };
    return lu.map((p) => {
      const y = ROWS[p.slot][idx[p.slot]++];
      let x = POS_X[p.slot];
      if (mirror) x = 100 - x;
      return { ...p, x, y };
    });
  }

  function seeded(n) { const x = Math.sin(n * 7.13) * 10000; return x - Math.floor(x); }

  function StatCompare({ label, a, b, pct, unit }) {
    const total = a + b || 1;
    const pa = pct ? a : Math.round((a / total) * 100);
    const u = unit || (pct ? "%" : "");
    const aWin = a > b, bWin = b > a;
    return (
      <div style={{ marginBottom: 13 }}>
        <div className="row" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
          <span className="num" style={{ fontWeight: 700, color: aWin ? "var(--gold-2)" : "var(--tx-2)" }}>{a}{u}</span>
          <span className="mono-label" style={{ margin: 0 }}>{label}</span>
          <span className="num" style={{ fontWeight: 700, color: bWin ? "#7c97cf" : "var(--tx-2)" }}>{b}{u}</span>
        </div>
        <div className="vs-bar"><div className="track" style={{ gridColumn: "1 / -1" }}>
          <i style={{ width: pa + "%", background: "var(--gold)" }}></i>
          <i style={{ width: (100 - pa) + "%", background: "#5a7bbf" }}></i>
        </div></div>
      </div>
    );
  }

  function MatchDetail({ id }) {
    const ctx = useContext(AppCtx);
    const [tab, setTab] = useState("overview");
    const m = WC.MATCHES.find((x) => x.id === id);
    if (!m) return <Empty icon="info" title="Match not found" />;
    const v = WC.venueById(m.venue);
    const home = WC.teamById[m.home], away = WC.teamById[m.away];
    const played = m.status !== "UPCOMING";
    const saved = ctx.isFav("matches", m.id);

    // derived stats
    const pH = m.possH != null ? Math.min(72, Math.max(28, m.possH)) : 50;
    const shotsH = m.shotsH ?? (9 + (home.ranking % 4));
    const shotsA = m.shotsA ?? (8 + (away.ranking % 4));
    const sotH = m.shotsTH ?? Math.max(m.homeGoals || 1, Math.round(shotsH * 0.4));
    const sotA = m.shotsTA ?? Math.max(m.awayGoals || 1, Math.round(shotsA * 0.4));
    const xgH = ((m.homeGoals ?? 1) * 0.8 + sotH * 0.18).toFixed(1);
    const xgA = ((m.awayGoals ?? 1) * 0.8 + sotA * 0.18).toFixed(1);

    // pre-match win probability from rankings
    const wp = useMemo(() => {
      const ra = home.ranking, rb = away.ranking;
      let h = 1 / ra, a = 1 / rb; const d = (h + a) * 0.42;
      const tot = h + a + d;
      return { h: Math.round(h / tot * 100), d: Math.round(d / tot * 100), a: 100 - Math.round(h / tot * 100) - Math.round(d / tot * 100) };
    }, [id]);

    // events
    const events = useMemo(() => {
      const ev = [];
      const mk = (min, team, type, who, sub) => ev.push({ min, team, type, who, sub });
      const hp = WC.playersByTeam(m.home), ap = WC.playersByTeam(m.away);
      if (!played) return [];
      const mins = [9, 17, 23, 34, 41, 52, 58, 64, 71, 78, 85, 90];
      let hi = 0, ai = 0, mi = 0;
      for (let i = 0; i < (m.homeGoals || 0); i++) mk(mins[mi++ % mins.length], m.home, "goal", (hp[hi++ % Math.max(hp.length, 1)] || {}).name || "Home scorer", "Assist · " + ((hp[hi % hp.length] || {}).name || "—"));
      for (let i = 0; i < (m.awayGoals || 0); i++) mk(mins[mi++ % mins.length], m.away, "goal", (ap[ai++ % Math.max(ap.length, 1)] || {}).name || "Away scorer", "Assist · " + ((ap[ai % ap.length] || {}).name || "—"));
      mk(36, m.home, "yellow", (hp[2] || {}).name || "Defender", "Tactical foul");
      mk(54, m.away, "yellow", (ap[3] || {}).name || "Midfielder", "Dissent");
      mk(62, m.home, "sub", (hp[8] || {}).name || "Forward", "↓ " + ((hp[9] || {}).name || "—"));
      mk(70, m.away, "sub", (ap[1] || {}).name || "Midfielder", "↓ " + ((ap[6] || {}).name || "—"));
      return ev.sort((x, y) => x.min - y.min);
    }, [id]);

    // momentum (18 x 5-min blocks)
    const momentum = useMemo(() => {
      return Array.from({ length: 18 }, (_, i) => {
        const base = (seeded(id.charCodeAt(2) + i * 3.1) - 0.5) * 2;
        const bias = (pH - 50) / 60;
        let val = Math.max(-1, Math.min(1, base + bias));
        const goalHere = events.find((e) => e.type === "goal" && Math.floor(e.min / 5) === i);
        return { val, goal: goalHere ? goalHere.team : null };
      });
    }, [id]);

    // key players
    const keyH = WC.playersByTeam(m.home).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];
    const keyA = WC.playersByTeam(m.away).sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];

    // h2h synthetic
    const h2h = useMemo(() => {
      const n = 6, rec = { h: 0, d: 0, a: 0, last: [] };
      for (let i = 0; i < n; i++) {
        const r = seeded(home.ranking + away.ranking + i * 5.7);
        if (r > 0.6) { rec.h++; rec.last.push("H"); }
        else if (r > 0.35) { rec.d++; rec.last.push("D"); }
        else { rec.a++; rec.last.push("A"); }
      }
      return rec;
    }, [id]);

    const evIcon = { goal: "ball", yellow: "note", red: "note", sub: "sub" };
    const evColor = { goal: "var(--gold)", yellow: "var(--warn)", red: "var(--neg)", sub: "#6ea0ff" };
    const goalscorers = events.filter((e) => e.type === "goal");

    const TABS = played
      ? [["overview", "Overview"], ["timeline", "Timeline"], ["lineups", "Lineups"], ["stats", "Statistics"], ["h2h", "Head-to-head"]]
      : [["overview", "Preview"], ["lineups", "Probable XI"], ["h2h", "Head-to-head"]];

    return (
      <div className="page-fade">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <button className="btn ghost btn-sm" onClick={() => ctx.back()}><Icon name="arrowL" size={15} /> Back</button>
          <button className={"btn btn-sm " + (saved ? "gold" : "ghost")} onClick={() => ctx.toggleFav("matches", m.id)}><Icon name="star" size={14} />{saved ? "Saved" : "Save match"}</button>
        </div>

        {/* scoreboard */}
        <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
          <div style={{ height: 5, background: `linear-gradient(90deg, ${home.colorA}, ${home.colorB} 45%, ${away.colorB} 55%, ${away.colorA})` }}></div>
          <div className="card-pad">
            <div className="row gap-8" style={{ justifyContent: "center", marginBottom: 16 }}>
              <StatusBadge m={m} /><span className="mono-label" style={{ margin: 0 }}>{m.stage} · {m.round}</span>
            </div>
            <div className="match-row" style={{ gridTemplateColumns: "1fr auto 1fr", gap: 18 }}>
              <div className="clickable" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }} onClick={() => ctx.nav("team", { code: m.home })}>
                <Crest code={m.home} size={62} slot />
                <div><div style={{ fontWeight: 700, fontSize: 16 }}>{home.name}</div><div className="mono-label">FIFA #{home.ranking}</div></div>
              </div>
              <div style={{ textAlign: "center" }}>
                {played
                  ? <div className="num" style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1, whiteSpace: "nowrap" }}>{m.homeGoals}<span className="muted" style={{ margin: "0 10px" }}>–</span>{m.awayGoals}</div>
                  : <div className="num" style={{ fontSize: 34, fontWeight: 800, whiteSpace: "nowrap" }}>{m.time}</div>}
                <div className="mono-label" style={{ marginTop: 8 }}>{played ? (m.status === "LIVE" ? m.minute + "' LIVE" : "Full Time") : fmtFull(m.date)}</div>
              </div>
              <div className="clickable" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }} onClick={() => ctx.nav("team", { code: m.away })}>
                <Crest code={m.away} size={62} slot />
                <div><div style={{ fontWeight: 700, fontSize: 16 }}>{away.name}</div><div className="mono-label">FIFA #{away.ranking}</div></div>
              </div>
            </div>
            {goalscorers.length > 0 && (
              <div className="row gap-8" style={{ justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                <Icon name="ball" size={13} style={{ color: "var(--gold)" }} />
                {goalscorers.map((g, i) => <span key={i} className="mono-label" style={{ margin: 0 }}>{g.who} {g.min}'{i < goalscorers.length - 1 ? " ·" : ""}</span>)}
              </div>
            )}
            <div className="row gap-16" style={{ justifyContent: "center", marginTop: 14, color: "var(--tx-3)", fontSize: 12, flexWrap: "wrap" }}>
              <span className="row gap-6"><Icon name="pin" size={13} />{v.stadium}, {v.city}</span>
              <span className="row gap-6"><Icon name="user" size={13} />{v.capacity.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="row gap-8 wrap" style={{ marginBottom: 18 }}>
          {TABS.map(([v2, l]) => <span key={v2} className={"pill" + (tab === v2 ? " on" : "")} onClick={() => setTab(v2)}>{l}</span>)}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <div className="card">
              <div className="card-hd"><Icon name="target" size={15} style={{ color: "var(--gold)" }} /><h3>{played ? "Pre-match probability" : "Win probability"}</h3></div>
              <div className="card-pad">
                <div className="winprob">
                  <i className="wp-h" style={{ width: wp.h + "%" }}>{wp.h}%</i>
                  <i className="wp-d" style={{ width: wp.d + "%" }}>{wp.d}%</i>
                  <i className="wp-a" style={{ width: wp.a + "%" }}>{wp.a}%</i>
                </div>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                  <span className="mono-label" style={{ margin: 0 }}>{m.home} win</span><span className="mono-label" style={{ margin: 0 }}>Draw</span><span className="mono-label" style={{ margin: 0 }}>{m.away} win</span>
                </div>
                <div className="divider"></div>
                <div className="row" style={{ justifyContent: "space-around", textAlign: "center" }}>
                  <div><div className="num tx-gold" style={{ fontWeight: 700, fontSize: 22 }}>{xgH}</div><div className="mono-label">xG {m.home}</div></div>
                  <div><div className="num" style={{ fontWeight: 700, fontSize: 22, color: "#7c97cf" }}>{xgA}</div><div className="mono-label">xG {m.away}</div></div>
                </div>
              </div>
            </div>

            {played && (
              <div className="card">
                <div className="card-hd"><Icon name="stats" size={15} style={{ color: "var(--gold)" }} /><h3>Momentum</h3><span className="spacer"></span><span className="mono-label" style={{ margin: 0 }}>Pressure index</span></div>
                <div className="card-pad">
                  <div className="momentum"><div className="mid"></div>
                    {momentum.map((b, i) => (
                      <i key={i} style={{ height: Math.abs(b.val) * 50 + "%", alignSelf: b.val >= 0 ? "flex-start" : "flex-end", background: b.val >= 0 ? "var(--gold)" : "#5a7bbf", opacity: .55 + Math.abs(b.val) * .45 }}>
                        {b.goal && <span className="goal-mark" style={{ background: b.goal === m.home ? "var(--gold)" : "#7c97cf", top: b.val >= 0 ? -10 : "auto", bottom: b.val >= 0 ? "auto" : -10 }}></span>}
                      </i>
                    ))}
                  </div>
                  <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
                    <span className="mono-label" style={{ margin: 0, color: "var(--gold-2)" }}>▲ {m.home}</span>
                    <span className="mono-label" style={{ margin: 0 }}>0' — 90'</span>
                    <span className="mono-label" style={{ margin: 0, color: "#7c97cf" }}>▼ {m.away}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-hd"><Icon name="flame" size={15} style={{ color: "var(--gold)" }} /><h3>Key players</h3></div>
              <div className="card-pad" style={{ paddingTop: 6 }}>
                {[keyH, keyA].map((p) => p && (
                  <div key={p.id} className="row gap-12 clickable" style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }} onClick={() => ctx.nav("player", { id: p.id })}>
                    <Avatar player={p} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }} className="nowrap">{p.name}</div>
                      <div className="mono-label" style={{ margin: 0 }}>{p.team} · {p.posLong}</div>
                    </div>
                    <div style={{ textAlign: "right" }}><div className="num tx-gold" style={{ fontWeight: 700 }}>{p.goals}G {p.assists}A</div><div className="mono-label" style={{ margin: 0 }}>{p.minutes}'</div></div>
                  </div>
                ))}
              </div>
            </div>

            {played && (
              <div className="card">
                <div className="card-hd"><Icon name="whistle" size={15} style={{ color: "var(--gold)" }} /><h3>At a glance</h3></div>
                <div className="card-pad">
                  <StatCompare label="Possession" a={pH} b={100 - pH} pct />
                  <StatCompare label="Shots" a={shotsH} b={shotsA} />
                  <StatCompare label="On target" a={sotH} b={sotA} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TIMELINE */}
        {tab === "timeline" && played && (
          <div className="card card-pad">
            <div className="tl"><div className="axis"></div>
              <div className="tl-half"><span>1st half</span></div>
              {events.filter((e) => e.min <= 45).map((e, i) => <TLRow key={i} e={e} home={m.home} evIcon={evIcon} evColor={evColor} />)}
              <div className="tl-half"><span>2nd half</span></div>
              {events.filter((e) => e.min > 45).map((e, i) => <TLRow key={i} e={e} home={m.home} evIcon={evIcon} evColor={evColor} />)}
              <div className="tl-half"><span>Full time</span></div>
            </div>
          </div>
        )}

        {/* LINEUPS — pitch */}
        {tab === "lineups" && (
          <div className="grid" style={{ gap: 18 }}>
            <div className="card card-pad">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <span className="row gap-8"><Crest code={m.home} size={22} /><b style={{ fontSize: 14 }}>{home.name}</b><span className="mono-label" style={{ margin: 0 }}>4-3-3</span></span>
                <span className="row gap-8"><span className="mono-label" style={{ margin: 0 }}>4-3-3</span><b style={{ fontSize: 14 }}>{away.name}</b><Crest code={m.away} size={22} /></span>
              </div>
              <div className="pitch"><div className="lines"></div>
                {placed(m.home, false).map((p) => <PP key={p.id} p={p} color={home.colorA} onClick={() => p.goals != null && ctx.nav("player", { id: p.id })} />)}
                {placed(m.away, true).map((p) => <PP key={p.id} p={p} color={away.colorA} onClick={() => p.goals != null && ctx.nav("player", { id: p.id })} />)}
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
              {[m.home, m.away].map((code) => (
                <div key={code} className="card">
                  <div className="card-hd"><Crest code={code} size={24} /><h3>{WC.teamById[code].name}</h3><span className="spacer"></span><span className="mono-label" style={{ margin: 0 }}>Starting XI</span></div>
                  <div className="card-pad" style={{ paddingTop: 6 }}>
                    {lineupFor(code).map((p) => (
                      <div key={p.id} className={"row gap-10 " + (p.goals != null ? "clickable" : "")} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }} onClick={() => p.goals != null && ctx.nav("player", { id: p.id })}>
                        <span className="num muted" style={{ width: 22, textAlign: "center" }}>{p.number}</span>
                        <span className={"pos-tag pos-" + p.slot}>{p.slot}</span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                        {goalscorers.some((g) => g.who === p.name) && <Icon name="ball" size={13} style={{ color: "var(--gold)", marginLeft: "auto" }} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATISTICS */}
        {tab === "stats" && played && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <div className="card card-pad">
              <div className="row gap-12" style={{ justifyContent: "center", marginBottom: 16 }}>
                <span className="row gap-8"><Crest code={m.home} size={22} /><b>{m.home}</b></span><span className="muted">vs</span><span className="row gap-8"><b>{m.away}</b><Crest code={m.away} size={22} /></span>
              </div>
              <StatCompare label="Possession" a={pH} b={100 - pH} pct />
              <StatCompare label="Shots" a={shotsH} b={shotsA} />
              <StatCompare label="Shots on target" a={sotH} b={sotA} />
              <StatCompare label="Expected goals" a={parseFloat(xgH)} b={parseFloat(xgA)} unit=" xG" />
              <StatCompare label="Corners" a={5 + (m.homeGoals % 3)} b={4 + (m.awayGoals % 3)} />
              <StatCompare label="Fouls" a={11} b={13} />
              <StatCompare label="Pass accuracy" a={86} b={83} pct />
            </div>
            <div className="card">
              <div className="card-hd"><Icon name="target" size={15} style={{ color: "var(--gold)" }} /><h3>Shot accuracy</h3></div>
              <div className="card-pad">
                <div className="row" style={{ justifyContent: "space-around", textAlign: "center" }}>
                  {[[m.home, shotsH, sotH, "var(--gold)"], [m.away, shotsA, sotA, "#7c97cf"]].map(([code, sh, sot, col]) => (
                    <div key={code} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div className="donut" style={{ "--p": Math.round(sot / sh * 100), background: `conic-gradient(${col} calc(${Math.round(sot / sh * 100)}*1%), var(--bg-3) 0)` }}>
                        <div className="hole"><span className="num" style={{ fontWeight: 800, fontSize: 18 }}>{Math.round(sot / sh * 100)}%</span></div>
                      </div>
                      <div><div style={{ fontWeight: 700 }}>{code}</div><div className="mono-label" style={{ margin: 0 }}>{sot}/{sh} on target</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* H2H */}
        {tab === "h2h" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <div className="card">
              <div className="card-hd"><Icon name="swap" size={15} style={{ color: "var(--gold)" }} /><h3>Last {h2h.h + h2h.d + h2h.a} meetings</h3></div>
              <div className="card-pad">
                <div className="h2h-record">
                  <div style={{ textAlign: "center" }}><Crest code={m.home} size={36} /><div className="h2h-big tx-gold" style={{ marginTop: 6 }}>{h2h.h}</div><div className="mono-label">{m.home} wins</div></div>
                  <div style={{ textAlign: "center" }}><div className="h2h-big muted">{h2h.d}</div><div className="mono-label">Draws</div></div>
                  <div style={{ textAlign: "center" }}><Crest code={m.away} size={36} /><div className="h2h-big" style={{ marginTop: 6, color: "#7c97cf" }}>{h2h.a}</div><div className="mono-label">{m.away} wins</div></div>
                </div>
                <div className="divider"></div>
                <div className="row gap-8" style={{ justifyContent: "center" }}>
                  <span className="mono-label" style={{ margin: 0 }}>Recent</span>
                  {h2h.last.map((r, i) => <b key={i} className={"form-pill"} style={{ width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", fontFamily: "var(--font-num)", fontSize: 10, fontWeight: 700, color: "#0a0d14", background: r === "H" ? "var(--gold)" : r === "A" ? "#7c97cf" : "var(--tx-3)" }}>{r}</b>)}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-hd"><Icon name="stats" size={15} style={{ color: "var(--gold)" }} /><h3>Form into this match</h3></div>
              <div className="card-pad">
                {[m.home, m.away].map((code) => { const s = WC.STANDINGS[code]; return (
                  <div key={code} className="row gap-12" style={{ padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
                    <Crest code={code} size={30} />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{WC.teamById[code].name}</div><div className="mono-label" style={{ margin: 0 }}>{s.Pts} pts · GD {s.GD > 0 ? "+" : ""}{s.GD}</div></div>
                    <Form list={s.form} />
                  </div>
                ); })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function PP({ p, color, onClick }) {
    const last = p.name.includes("#") ? "" : p.name.split(" ").slice(-1)[0];
    return (
      <div className="pp" style={{ left: p.x + "%", top: p.y + "%", cursor: p.goals != null ? "pointer" : "default" }} onClick={onClick}>
        <span className="dot" style={{ background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 55%, #000))` }}>{p.number}</span>
        {last && <span className="nm">{last}</span>}
      </div>
    );
  }
  function TLRow({ e, home, evIcon, evColor }) {
    const left = e.team === home;
    const card = (
      <div className={"tl-card" + (left ? "" : " right")} style={{ borderColor: e.type === "goal" ? "var(--gold-line)" : "var(--line)" }}>
        <span style={{ color: evColor[e.type] }}><Icon name={evIcon[e.type]} size={14} /></span>
        <span><span style={{ fontWeight: 600, fontSize: 12.5, display: "block" }}>{e.who}</span><span className="mono-label" style={{ margin: 0 }}>{e.sub}</span></span>
      </div>
    );
    return (
      <div className="tl-ev">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>{left ? card : null}</div>
        <div className="tl-min">{e.min}'</div>
        <div>{!left ? card : null}</div>
      </div>
    );
  }

  window.MatchCenterScreen = MatchCenter;
  window.MatchDetailScreen = MatchDetail;
})();
