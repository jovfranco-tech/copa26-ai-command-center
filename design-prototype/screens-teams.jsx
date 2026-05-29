/* screens-teams.jsx — Teams grid + Team detail */
(function () {
  const { useContext, useState } = React;
  const Icon = window.Icon, WC = window.WC;
  const { TeamCard, Crest, Flag, Form, Avatar, FavStar, Section, Empty, MatchRow, fmtFull } = window;

  function Teams() {
    const ctx = useContext(AppCtx);
    const [group, setGroup] = useState("all");
    const [q, setQ] = useState("");
    const list = WC.TEAMS.filter((t) =>
      (group === "all" || t.group === group) &&
      (q === "" || t.name.toLowerCase().includes(q.toLowerCase()) || t.code.toLowerCase().includes(q.toLowerCase()))
    );
    return (
      <div className="page-fade">
        <div className="row gap-10 wrap" style={{ marginBottom: 18 }}>
          <div className="searchbox" style={{ marginLeft: 0, maxWidth: 260 }}>
            <Icon name="search" size={15} />
            <input placeholder="Search teams…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="scroll-x" style={{ flex: 1 }}>
            <div className="row gap-6 nowrap">
              <span className={"pill" + (group === "all" ? " on" : "")} onClick={() => setGroup("all")}>All</span>
              {WC.GROUP_LETTERS.map((g) => <span key={g} className={"pill" + (group === g ? " on" : "")} onClick={() => setGroup(g)}>{g}</span>)}
            </div>
          </div>
        </div>
        {list.length === 0 && <Empty icon="teams" title="No teams" text="No teams match your search." />}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))" }}>
          {list.map((t) => <TeamCard key={t.id} code={t.id} onOpen={(code) => ctx.nav("team", { code })} />)}
        </div>
      </div>
    );
  }

  function TeamDetail({ code }) {
    const ctx = useContext(AppCtx);
    const [tab, setTab] = useState("squad");
    const t = WC.teamById[code];
    if (!t) return <Empty icon="info" title="Team not found" />;
    const s = WC.STANDINGS[code];
    const squad = WC.playersByTeam(code);
    const fixtures = WC.MATCHES.filter((m) => m.home === code || m.away === code);
    const table = WC.groupTable(t.group);
    const pos = table.findIndex((r) => r.team === code) + 1;
    const teamGoals = squad.reduce((a, p) => a + p.goals, 0);

    return (
      <div className="page-fade">
        <button className="btn ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => ctx.back()}><Icon name="arrowL" size={15} /> Back</button>
        <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: 80, background: `linear-gradient(120deg, ${t.colorA}, ${t.colorB})`, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent, var(--bg-2))" }}></div>
          </div>
          <div className="card-pad" style={{ paddingTop: 0 }}>
            <div className="row gap-16 wrap" style={{ marginTop: -34, alignItems: "flex-end" }}>
              <Crest code={code} size={84} slot />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{t.name}</div>
                <div className="mono-label">Group {t.group} · {t.confederation} · FIFA Rank #{t.ranking}</div>
              </div>
              <div className="row gap-10">
                <button className="btn ghost btn-sm" onClick={() => ctx.nav("standings", { group: t.group })}><Icon name="standings" size={14} /> Group table</button>
                <button className="btn gold btn-sm" onClick={() => ctx.toggleFav("teams", code)}><Icon name="star" size={14} />{ctx.isFav("teams", code) ? "Favorited" : "Favorite"}</button>
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", marginTop: 20 }}>
              {[["Position", pos + (pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th")], ["Points", s.Pts], ["Played", s.P], ["GF", s.GF], ["GA", s.GA], ["GD", (s.GD > 0 ? "+" : "") + s.GD]].map(([k, val]) => (
                <div key={k}><div className="mono-label">{k}</div><div className="num" style={{ fontWeight: 700, fontSize: 19, marginTop: 2 }}>{val}</div></div>
              ))}
              <div><div className="mono-label">Form</div><div style={{ marginTop: 6 }}><Form list={s.form} /></div></div>
            </div>
          </div>
        </div>

        <div className="row gap-8 wrap" style={{ marginBottom: 16 }}>
          {[["squad", "Squad"], ["route", "Group route"], ["fixtures", "Fixtures"], ["stats", "Team stats"]].map(([v, l]) =>
            <span key={v} className={"pill" + (tab === v ? " on" : "")} onClick={() => setTab(v)}>{l}</span>)}
        </div>

        {tab === "squad" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
            {squad.map((p) => (
              <div key={p.id} className="card hoverable" style={{ padding: 13 }} onClick={() => ctx.nav("player", { id: p.id })}>
                <div className="row gap-10">
                  <Avatar player={p} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }} className="nowrap">{p.name}</div>
                    <div className="row gap-6 mono-label"><span className={"pos-tag pos-" + p.pos}>{p.pos}</span><span>{p.club}</span></div>
                  </div>
                  <span className="num muted" style={{ fontSize: 13 }}>#{p.number}</span>
                </div>
              </div>
            ))}
            {squad.length === 0 && <Empty icon="players" title="Squad pending" text="Roster data will appear here." />}
          </div>
        )}

        {tab === "route" && (() => {
          const groupFix = fixtures.filter((m) => m.group === t.group).sort((a, b) => a.matchday - b.matchday);
          let pts = 0;
          const steps = groupFix.map((m) => {
            const isHome = m.home === code, opp = isHome ? m.away : m.home;
            let res = null, gf = null, ga = null;
            if (m.status !== "UPCOMING") {
              gf = isHome ? m.homeGoals : m.awayGoals; ga = isHome ? m.awayGoals : m.homeGoals;
              res = gf > ga ? "W" : gf < ga ? "L" : "D"; pts += res === "W" ? 3 : res === "D" ? 1 : 0;
            }
            return { m, opp, isHome, res, gf, ga, runPts: pts };
          });
          const maxPts = 9;
          return (
            <div className="grid" style={{ gap: 16 }}>
              <div className="card card-pad">
                <div className="mono-label" style={{ marginBottom: 14 }}>Group {t.group} route · {pts} pts so far</div>
                <div className="route-track">
                  {steps.map((st, i) => (
                    <div key={i} className="route-step">
                      {i > 0 && <span className={"route-line " + (steps[i].res ? "done" : "")}></span>}
                      <div className={"route-node " + (st.res || "up")}>{st.res || (i + 1)}</div>
                      <div className="route-card clickable" onClick={() => ctx.nav("match", { id: st.m.id })}>
                        <div className="mono-label" style={{ margin: 0 }}>MD{st.m.matchday} · {st.isHome ? "vs" : "@"}</div>
                        <div className="row gap-8" style={{ margin: "6px 0" }}><Crest code={st.opp} size={26} /><span style={{ fontWeight: 700, fontSize: 13 }} className="nowrap">{WC.teamById[st.opp].name}</span></div>
                        {st.res
                          ? <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>{st.gf}–{st.ga}</div>
                          : <div className="num muted" style={{ fontWeight: 700 }}>{st.m.time}</div>}
                        <div className="mono-label" style={{ margin: "4px 0 0" }}>{fmtFull(st.m.date).split(",")[0]} · {WC.venueById(st.m.venue).city}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-pad">
                <div className="mono-label" style={{ marginBottom: 12 }}>Points progression</div>
                <div className="row gap-12" style={{ alignItems: "flex-end", height: 90 }}>
                  {steps.map((st, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ height: 64, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        <div style={{ width: "60%", borderRadius: "6px 6px 0 0", height: (st.runPts / maxPts * 100) + "%", minHeight: 4, background: st.res ? "var(--gold)" : "var(--bg-hover)" }}></div>
                      </div>
                      <div className="num" style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{st.runPts}</div>
                      <div className="mono-label" style={{ margin: 0 }}>MD{st.m.matchday}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {tab === "fixtures" && (
          <div className="card card-pad">
            {fixtures.map((m) => <MatchRow key={m.id} m={m} onOpen={(id) => ctx.nav("match", { id })} />)}
          </div>
        )}

        {tab === "stats" && (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
            {[["Goals for", s.GF, "ball"], ["Goals against", s.GA, "shield"], ["Top scorer", (squad.sort((a,b)=>b.goals-a.goals)[0]||{}).name || "—", "flame"], ["Squad size", squad.length, "players"], ["Avg age", Math.round(squad.reduce((a,p)=>a+p.age,0)/Math.max(squad.length,1)) || "—", "user"], ["Clean sheets", Math.max(0, s.P - (s.GA>0?1:0)), "target"]].map(([k, val, ic]) => (
              <div key={k} className="card stat-tile">
                <div className="stat-k"><span style={{ color: "var(--gold)" }}><Icon name={ic} size={15} /></span><span className="mono-label">{k}</span></div>
                <div className="stat-v" style={{ fontSize: typeof val === "string" && val.length > 6 ? 18 : 28 }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  window.TeamsScreen = Teams;
  window.TeamDetailScreen = TeamDetail;
})();
