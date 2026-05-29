/* screens-favorites.jsx — Favorites + personal notes */
(function () {
  const { useContext, useState } = React;
  const Icon = window.Icon, WC = window.WC;
  const { Crest, Avatar, Flag, Form, Empty, MatchRow } = window;

  function Notes() {
    const ctx = useContext(AppCtx);
    const [val, setVal] = useState(ctx.notes || "");
    return (
      <div className="card">
        <div className="card-hd"><Icon name="note" size={15} style={{ color: "var(--gold)" }} /><h3>Personal notes</h3>
          <span className="spacer"></span><span className="mono-label">Saved locally</span></div>
        <div className="card-pad">
          <textarea value={val} onChange={(e) => { setVal(e.target.value); ctx.setNotes(e.target.value); }}
            placeholder="Track scouting notes, players to watch, match predictions…"
            style={{ width: "100%", minHeight: 130, resize: "vertical", background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--tx)", padding: 12, fontFamily: "var(--font-ui)", fontSize: 13.5, lineHeight: 1.6, outline: "none" }} />
        </div>
      </div>
    );
  }

  function Favorites() {
    const ctx = useContext(AppCtx);
    const [tab, setTab] = useState("teams");
    const f = ctx.favs;
    const tabs = [["teams", "Teams", f.teams.length], ["players", "Players", f.players.length], ["matches", "Matches", f.matches.length], ["notes", "Notes", null]];
    return (
      <div className="page-fade">
        <div className="row gap-8 wrap" style={{ marginBottom: 18 }}>
          {tabs.map(([v, l, n]) => <span key={v} className={"pill" + (tab === v ? " on" : "")} onClick={() => setTab(v)}>{l}{n != null && <span className="num muted" style={{ marginLeft: 4 }}>{n}</span>}</span>)}
        </div>

        {tab === "teams" && (f.teams.length === 0
          ? <Empty icon="star" title="No favorite teams" text="Tap the star on any team to follow them here." action={<button className="btn gold btn-sm" onClick={() => ctx.nav("teams")}>Browse teams</button>} />
          : <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
              {f.teams.map((code) => {
                const s = WC.STANDINGS[code], t = WC.teamById[code];
                const next = WC.MATCHES.find((m) => (m.home === code || m.away === code) && m.status !== "FT");
                return (
                  <div key={code} className="card hoverable" style={{ overflow: "hidden" }} onClick={() => ctx.nav("team", { code })}>
                    <div style={{ height: 5, background: `linear-gradient(90deg, ${t.colorA}, ${t.colorB})` }}></div>
                    <div className="card-pad">
                      <div className="row gap-12"><Crest code={code} size={42} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{t.name}</div><div className="mono-label">{s.Pts} pts · Group {t.group}</div></div>
                        <button className="fav-btn on" onClick={(e) => { e.stopPropagation(); ctx.toggleFav("teams", code); }}><Icon name="star" size={18} /></button></div>
                      <div className="row gap-16" style={{ marginTop: 12, justifyContent: "space-between" }}>
                        <Form list={s.form} />
                        {next && <span className="mono-label">Next: vs {next.home === code ? next.away : next.home}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>)}

        {tab === "players" && (f.players.length === 0
          ? <Empty icon="star" title="No favorite players" text="Star players to keep their stats one tap away." action={<button className="btn gold btn-sm" onClick={() => ctx.nav("players")}>Browse players</button>} />
          : <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
              {f.players.map((id) => { const p = WC.PLAYERS.find((x) => x.id === id); if (!p) return null; const t = WC.teamById[p.team];
                return (
                  <div key={id} className="card hoverable" style={{ padding: 14 }} onClick={() => ctx.nav("player", { id })}>
                    <div className="row gap-12"><Avatar player={p} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }} className="nowrap">{p.name}</div>
                        <div className="row gap-6 mono-label"><Flag code={p.team} size={12} />{t.name} · {p.posLong}</div></div>
                      <div style={{ textAlign: "right" }}><div className="num tx-gold" style={{ fontWeight: 700, fontSize: 18 }}>{p.goals}</div><div className="mono-label">{p.assists} ast</div></div>
                    </div>
                  </div>
                ); })}
            </div>)}

        {tab === "matches" && (f.matches.length === 0
          ? <Empty icon="calendar" title="No saved matches" text="Save fixtures you don't want to miss from any match card." action={<button className="btn gold btn-sm" onClick={() => ctx.nav("matches")}>Match Center</button>} />
          : <div className="card card-pad">{f.matches.map((id) => { const m = WC.MATCHES.find((x) => x.id === id); return m ? <MatchRow key={id} m={m} onOpen={(mid) => ctx.nav("match", { id: mid })} /> : null; })}</div>)}

        {tab === "notes" && <Notes />}
      </div>
    );
  }
  window.FavoritesScreen = Favorites;
})();
