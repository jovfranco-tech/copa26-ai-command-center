/* screens-bracket.jsx — Interactive knockout bracket (projected) */
(function () {
  const { useContext, useMemo, useState } = React;
  const Icon = window.Icon, WC = window.WC;
  const { Crest, Empty } = window;

  function winner(a, b, salt) {
    if (!a || !b) return a || b;
    const ra = WC.teamById[a].ranking, rb = WC.teamById[b].ranking;
    const upset = (Math.sin((ra + rb + salt) * 2.7) > 0.72);
    return upset ? (ra > rb ? a : b) : (ra < rb ? a : b);
  }
  function loser(m) { return m.w === m.a ? m.b : m.a; }
  function score(a, b, salt) {
    const x = Math.abs(Math.sin((WC.teamById[a].ranking + salt) * 3.1));
    const y = Math.abs(Math.sin((WC.teamById[b].ranking + salt) * 1.9));
    let ga = Math.floor(x * 3), gb = Math.floor(y * 3);
    if (ga === gb) ga += 1;
    return [ga, gb];
  }
  function fill(arr) { return arr.map((m) => {
    const w = winner(m.a, m.b, m.salt);
    const [s1, s2] = score(m.a, m.b, m.salt);
    let hi = Math.max(s1, s2), lo = Math.min(s1, s2);
    if (hi === lo) hi = lo + 1;
    const sa = w === m.a ? hi : lo;
    const sb = w === m.a ? lo : hi;
    return { ...m, sa, sb, w };
  }); }
  function next(prev, base) { const out = []; for (let i = 0; i < prev.length; i += 2) out.push({ a: prev[i].w, b: prev[i + 1].w, salt: base + i }); return out; }

  function buildRounds() {
    const R32 = fill(WC.BRACKET.r32.map((p, i) => ({ a: p[0], b: p[1], salt: i + 1 })));
    const R16 = fill(next(R32, 100));
    const QF = fill(next(R16, 200));
    const SF = fill(next(QF, 300));
    const F = fill(next(SF, 400));
    const TP = fill([{ a: loser(SF[0]), b: loser(SF[1]), salt: 500 }]); // third place
    return { R32, R16, QF, SF, F, TP };
  }

  function Side({ code, sc, focus, onClick, crumb }) {
    return (
      <div className={"bk-side " + (focus === code && code ? "focus " : "") + (code ? "" : "lose")} onClick={(e) => { e.stopPropagation(); code && onClick(code); }} style={{ cursor: code ? "pointer" : "default" }}>
        {code ? <Crest code={code} size={20} /> : <span className="crest" style={{ width: 20, height: 20, background: "var(--bg-3)" }}></span>}
        <span className="bk-name">{code ? WC.teamById[code].name : "TBD"}</span>
        {crumb && <span className="bk-crumb">{crumb}</span>}
        <span className="bk-sc">{sc}</span>
      </div>
    );
  }
  function BkMatch({ m, focus, onTeam, win }) {
    const onPath = focus && (m.a === focus || m.b === focus);
    const dim = focus && !onPath;
    return (
      <div className={"bk-match" + (onPath ? " on-path" : "") + (dim ? " dimmed" : "")}>
        <Side code={m.a} sc={m.sa} focus={focus} onClick={onTeam} />
        <Side code={m.b} sc={m.sb} focus={focus} onClick={onTeam} />
      </div>
    );
  }
  function Col({ title, matches, conn, focus, onTeam, reverse }) {
    return (
      <div className={"bk-col" + (conn ? " has-conn" : "")}>
        <div className="bk-round mono-label">{title}</div>
        {matches.map((m, i) => <BkMatch key={i} m={m} focus={focus} onTeam={onTeam} />)}
      </div>
    );
  }

  function Bracket() {
    const ctx = useContext(AppCtx);
    const R = useMemo(buildRounds, []);
    const [focus, setFocus] = useState(ctx.favs.teams[0] || null);
    const champ = R.F[0].w, runner = loser(R.F[0]), third = R.TP[0].w;
    const onTeam = (code) => setFocus((f) => f === code ? null : code);

    // split into two conferences for the classic centered layout
    const half = (arr) => [arr.slice(0, arr.length / 2), arr.slice(arr.length / 2)];
    const [r32L, r32R] = half(R.R32), [r16L, r16R] = half(R.R16), [qfL, qfR] = half(R.QF);
    const sfL = R.SF[0], sfR = R.SF[1];

    const focusInfo = focus ? (() => {
      const rounds = [["R32", R.R32], ["R16", R.R16], ["QF", R.QF], ["SF", R.SF], ["Final", R.F]];
      let reached = "—", out = null;
      for (const [name, ms] of rounds) {
        const inIt = ms.find((m) => m.a === focus || m.b === focus);
        if (inIt) { reached = name; if (inIt.w !== focus) { out = name; break; } }
        else break;
      }
      const isChamp = champ === focus;
      return { reached, out, isChamp };
    })() : null;

    return (
      <div className="page-fade">
        <div className="card card-pad" style={{ marginBottom: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--gold-soft)", color: "var(--gold)" }}><Icon name="trophy" size={20} /></span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Projected knockout path</div>
            <div className="mono-label">Round of 32 → Final · tap a team to trace its route</div>
          </div>
          <select className="pill" value={focus || ""} onChange={(e) => setFocus(e.target.value || null)} style={{ appearance: "auto" }}>
            <option value="">Trace a team…</option>
            {WC.TEAMS.filter((t) => WC.BRACKET.r32.flat().includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span className="badge gold">Projection</span>
        </div>

        {focusInfo && (
          <div className="card card-pad" style={{ marginBottom: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderColor: "var(--gold-line)" }}>
            <Crest code={focus} size={34} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700 }}>{WC.teamById[focus].name}</div>
              <div className="mono-label">{focusInfo.isChamp ? "Projected champion 🏆" : focusInfo.out ? `Projected exit: ${focusInfo.out}` : `Reaches: ${focusInfo.reached}`}</div>
            </div>
            <button className="btn ghost btn-sm" onClick={() => ctx.nav("team", { code: focus })}>View team <Icon name="chevR" size={13} /></button>
            <button className="btn ghost btn-sm" onClick={() => setFocus(null)}>Clear</button>
          </div>
        )}

        <div className="card" style={{ overflowX: "auto" }}>
          <div className="card-pad">
            <div className="bracket">
              {/* left conference */}
              <Col title="R32" matches={r32L} conn focus={focus} onTeam={onTeam} />
              <Col title="R16" matches={r16L} conn focus={focus} onTeam={onTeam} />
              <Col title="QF" matches={qfL} conn focus={focus} onTeam={onTeam} />
              <Col title="SF" matches={[sfL]} conn focus={focus} onTeam={onTeam} />

              {/* center: final + champion */}
              <div className="bk-col" style={{ minWidth: 210, justifyContent: "center" }}>
                <div className="bk-round mono-label" style={{ color: "var(--gold-2)" }}>Final</div>
                <div className={"bk-match" + ((focus && (R.F[0].a === focus || R.F[0].b === focus)) ? " on-path" : "")} style={{ borderColor: "var(--gold-line)", background: "var(--gold-soft)" }}>
                  <Side code={R.F[0].a} sc={R.F[0].sa} focus={focus} onClick={onTeam} />
                  <Side code={R.F[0].b} sc={R.F[0].sb} focus={focus} onClick={onTeam} />
                </div>
                <div className="bk-match bk-final" style={{ borderColor: "var(--gold-line)", background: "linear-gradient(160deg, var(--gold-soft), transparent)", marginTop: 12 }} onClick={() => ctx.nav("team", { code: champ })}>
                  <div className="bk-champ">
                    <Icon name="trophy" size={24} style={{ color: "var(--gold)" }} />
                    <Crest code={champ} size={48} slot />
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{WC.teamById[champ].name}</div>
                    <div className="mono-label">Champion</div>
                  </div>
                </div>
              </div>

              {/* right conference */}
              <Col title="SF" matches={[sfR]} focus={focus} onTeam={onTeam} />
              <Col title="QF" matches={qfR} focus={focus} onTeam={onTeam} />
              <Col title="R16" matches={r16R} focus={focus} onTeam={onTeam} />
              <Col title="R32" matches={r32R} focus={focus} onTeam={onTeam} />
            </div>
          </div>
        </div>

        {/* podium + third place */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", marginTop: 18 }}>
          <div className="card">
            <div className="card-hd"><Icon name="trophy" size={15} style={{ color: "var(--gold)" }} /><h3>Projected podium</h3></div>
            <div className="card-pad">
              <div className="podium">
                <div className="step p2 clickable" onClick={() => ctx.nav("team", { code: runner })}><Crest code={runner} size={36} /><span style={{ fontSize: 12, fontWeight: 700 }}>{runner}</span><div className="bar">2</div></div>
                <div className="step p1 clickable" onClick={() => ctx.nav("team", { code: champ })}><Icon name="trophy" size={18} style={{ color: "var(--gold)" }} /><Crest code={champ} size={42} /><span style={{ fontSize: 12.5, fontWeight: 800 }}>{champ}</span><div className="bar">1</div></div>
                <div className="step p3 clickable" onClick={() => ctx.nav("team", { code: third })}><Crest code={third} size={36} /><span style={{ fontSize: 12, fontWeight: 700 }}>{third}</span><div className="bar">3</div></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd"><Icon name="whistle" size={15} style={{ color: "var(--gold)" }} /><h3>Third-place play-off</h3></div>
            <div className="card-pad">
              <div className="bk-match" style={{ cursor: "default" }}>
                <Side code={R.TP[0].a} sc={R.TP[0].sa} focus={focus} onClick={onTeam} />
                <Side code={R.TP[0].b} sc={R.TP[0].sb} focus={focus} onClick={onTeam} />
              </div>
              <p className="muted" style={{ fontSize: 11.5, marginTop: 12, marginBottom: 0 }}>Contested by the losing semi-finalists.</p>
            </div>
          </div>
        </div>

        <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>Bracket is a data-driven projection from current standings and rankings — not an official draw.</p>
      </div>
    );
  }
  window.BracketScreen = Bracket;
})();
