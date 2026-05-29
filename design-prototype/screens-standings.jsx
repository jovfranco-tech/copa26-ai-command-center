/* screens-standings.jsx — Groups & Standings */
(function () {
  const { useContext, useState } = React;
  const Icon = window.Icon, WC = window.WC;
  const { Crest, Form, Empty } = window;

  function GroupTable({ letter, compact }) {
    const ctx = useContext(AppCtx);
    const rows = WC.groupTable(letter);
    return (
      <div className="card">
        <div className="card-hd">
          <span className="crest" style={{ width: 26, height: 26, fontSize: 11, background: "var(--gold-soft)", color: "var(--gold-2)", boxShadow: "inset 0 0 0 1px var(--gold-line)" }}>{letter}</span>
          <h3>Group {letter}</h3>
          <span className="spacer"></span>
          <span className="mono-label">{rows[0].P ? "MD " + Math.max(...rows.map(r=>r.P)) : "Not started"}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 30 }}>#</th><th>Team</th>
              <th className="center">P</th><th className="center">W</th><th className="center">D</th><th className="center">L</th>
              {!compact && <th className="center">GF</th>}{!compact && <th className="center">GA</th>}
              <th className="center">GD</th><th className="center">Pts</th>{!compact && <th>Form</th>}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const zone = i < 2 ? "q1" : i === 2 ? "q3" : "q4";
                const rowClass = i < 2 ? "r-adv" : i === 3 ? "r-elim" : "";
                return (
                <tr key={r.team} className={"clickable " + rowClass} onClick={() => ctx.nav("team", { code: r.team })}>
                  <td><span className="row gap-8"><span className={"qualify-bar " + zone}></span><span className="rank">{i + 1}</span></span></td>
                  <td><span className="row gap-10"><Crest code={r.team} size={24} /><span className="strong nowrap">{WC.teamById[r.team].name}</span></span></td>
                  <td className="center num">{r.P}</td><td className="center num">{r.W}</td><td className="center num">{r.D}</td><td className="center num">{r.L}</td>
                  {!compact && <td className="center num">{r.GF}</td>}{!compact && <td className="center num">{r.GA}</td>}
                  <td className={"center num " + (r.GD > 0 ? "gd-pos" : r.GD < 0 ? "gd-neg" : "")}>{r.GD > 0 ? "+" : ""}{r.GD}</td>
                  <td className="center num strong tx-gold">{r.Pts}</td>
                  {!compact && <td><Form list={r.form} /></td>}
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function Standings({ group }) {
    const [view, setView] = useState(group || "all");
    return (
      <div className="page-fade">
        <div className="row gap-10 wrap" style={{ marginBottom: 18 }}>
          <div className="scroll-x" style={{ flex: 1 }}>
            <div className="row gap-6 nowrap">
              <span className={"pill" + (view === "all" ? " on" : "")} onClick={() => setView("all")}>All groups</span>
              {WC.GROUP_LETTERS.map((g) => <span key={g} className={"pill" + (view === g ? " on" : "")} onClick={() => setView(g)}>Group {g}</span>)}
            </div>
          </div>
          <span className="row gap-12 mono-label nowrap zone-key">
            <span><span className="zone-sw" style={{ background: "var(--pos)" }}></span>Advance</span>
            <span><span className="zone-sw" style={{ background: "#6ea0ff" }}></span>Best-3rd</span>
            <span><span className="zone-sw" style={{ background: "var(--neg)" }}></span>Eliminated</span>
          </span>
        </div>
        {view === "all"
          ? <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(370px,1fr))" }}>
              {WC.GROUP_LETTERS.map((g) => <GroupTable key={g} letter={g} compact />)}
            </div>
          : <GroupTable letter={view} />}
      </div>
    );
  }

  window.StandingsScreen = Standings;
})();
