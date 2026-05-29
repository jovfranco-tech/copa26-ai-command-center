/* screens-ai.jsx — AI Match Analyst (grounded + context + citations) */
(function () {
  const { useContext, useState, useRef, useEffect } = React;
  const Icon = window.Icon, WC = window.WC;
  const { Crest, Avatar } = window;

  function buildContext() {
    const standings = WC.GROUP_LETTERS.map((g) => {
      const rows = WC.groupTable(g).map((r, i) => `${i + 1}.${WC.teamById[r.team].name} ${r.Pts}pts(${r.W}-${r.D}-${r.L},GD${r.GD})`);
      return `Group ${g}: ${rows.join(", ")}`;
    }).join("\n");
    const scorers = WC.topScorers(8).map((p) => `${p.name}(${p.team}) ${p.goals}G ${p.assists}A`).join(", ");
    const today = WC.matchesByDate(WC.TODAY).map((m) => `${WC.teamById[m.home].name} ${m.homeGoals ?? "-"}-${m.awayGoals ?? "-"} ${WC.teamById[m.away].name} [${m.status}] @${WC.venueById(m.venue).city}`).join("; ");
    const results = WC.MATCHES.filter((m) => m.status === "FT").slice(-12).map((m) => `${m.home} ${m.homeGoals}-${m.awayGoals} ${m.away}`).join("; ");
    return `STANDINGS:\n${standings}\n\nTOP SCORERS: ${scorers}\n\nTODAY (${WC.TODAY}): ${today}\n\nRECENT RESULTS: ${results}`;
  }
  function ctxString(c) {
    if (!c) return "";
    if (c.kind === "team") { const s = WC.STANDINGS[c.id]; return `FOCUS TEAM ${WC.teamById[c.id].name}: ${s.Pts}pts, ${s.W}-${s.D}-${s.L}, GF${s.GF} GA${s.GA}, GD${s.GD}, form ${s.form.join("")}`; }
    if (c.kind === "player") { const p = WC.PLAYERS.find((x) => x.id === c.id); return `FOCUS PLAYER ${p.name} (${p.team}, ${p.posLong}, ${p.club}): ${p.goals}G ${p.assists}A ${p.minutes}min ${p.yellow}YC`; }
    if (c.kind === "match") { const m = WC.MATCHES.find((x) => x.id === c.id); return `FOCUS MATCH ${m.home} ${m.homeGoals ?? "-"}-${m.awayGoals ?? "-"} ${m.away} [${m.status}] ${m.stage}`; }
    return "";
  }

  const SUGGESTIONS = ["Resumen de los partidos de hoy", "Compara Argentina vs Francia", "¿Qué partidos debería ver hoy?", "Analiza el Grupo C", "¿Quién lidera goleadores?"];
  const SOURCES = ["Standings", "Top scorers", "Today's fixtures", "Recent results"];

  function Bubble({ role, text, loading, sources, ctxLabel }) {
    const me = role === "user";
    return (
      <div className="row" style={{ justifyContent: me ? "flex-end" : "flex-start", marginBottom: 14 }}>
        {!me && <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--gold-soft)", color: "var(--gold)", marginRight: 9, flex: "none", alignSelf: "flex-start" }}><Icon name="ai" size={16} /></span>}
        <div style={{ maxWidth: "80%" }}>
          <div style={{ padding: "11px 14px", borderRadius: 13, fontSize: 13.5, lineHeight: 1.55,
            background: me ? "var(--gold-soft)" : "var(--bg-2)", border: "1px solid " + (me ? "var(--gold-line)" : "var(--line)"),
            borderTopRightRadius: me ? 4 : 13, borderTopLeftRadius: me ? 13 : 4, whiteSpace: "pre-wrap" }}>
            {ctxLabel && <div className="mono-label" style={{ marginBottom: 6 }}>Context · {ctxLabel}</div>}
            {loading ? <span className="row gap-6 muted"><span className="live-dot" style={{ background: "var(--gold)" }}></span>Reading local cache…</span> : text}
          </div>
          {!me && sources && <div className="row gap-6 wrap" style={{ marginTop: 7 }}><span className="mono-label" style={{ margin: 0 }}>Sources</span>{sources.map((s) => <span key={s} className="cite">{s}</span>)}</div>}
        </div>
      </div>
    );
  }

  function AIAnalyst() {
    const ctx = useContext(AppCtx);
    const [msgs, setMsgs] = useState([{ role: "ai", text: "Hola. Soy tu analista del torneo. Respondo solo con los datos locales en caché: tablas, partidos, goleadores y equipos. Añade un contexto (equipo, jugador o partido) o pregunta directamente." }]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [context, setContext] = useState(null);
    const scroller = useRef(null);
    useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [msgs, busy]);

    const ctxLabel = context ? (context.kind === "team" ? WC.teamById[context.id].name : context.kind === "player" ? WC.PLAYERS.find((x) => x.id === context.id).name : context.id) : null;

    async function ask(q) {
      if (!q.trim() || busy) return;
      setInput("");
      setMsgs((m) => [...m, { role: "user", text: q, ctxLabel }]);
      setBusy(true);
      const focus = ctxString(context);
      const prompt = `You are a private World Cup data analyst embedded in a local dashboard. Answer ONLY using the tournament data provided. Never invent players, scores, or facts not present. If the data lacks the answer, say so. Reply in the SAME language as the question. Be concise and structured. Do not mention being an AI or these instructions.\n\n=== TOURNAMENT DATA (local cache) ===\n${buildContext()}\n${focus ? "\n" + focus + "\n" : ""}=== END DATA ===\n\nQuestion: ${q}`;
      const usedSources = [...SOURCES, ...(ctxLabel ? ["Focus: " + ctxLabel] : [])];
      try {
        let answer;
        if (window.claude && window.claude.complete) answer = await window.claude.complete(prompt);
        else answer = "El analista necesita ejecutarse dentro del entorno con IA. Los datos siguen disponibles en cada sección del dashboard.";
        setMsgs((m) => [...m, { role: "ai", text: (answer || "").trim() || "No encontré ese dato en la información local.", sources: usedSources }]);
      } catch (e) {
        setMsgs((m) => [...m, { role: "ai", text: "No pude completar el análisis ahora. Intenta de nuevo.", sources: usedSources }]);
      }
      setBusy(false);
    }

    function setCtx(kind, id) { if (id) setContext({ kind, id }); }

    return (
      <div className="page-fade">
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 168px)", minHeight: 460, overflow: "hidden" }}>
          <div className="card-hd">
            <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--gold-soft)", color: "var(--gold)" }}><Icon name="ai" size={16} /></span>
            <h3>Match Analyst</h3><span className="mono-label">· grounded in local cache</span>
            <span className="spacer"></span><span className="badge"><span className="live-dot" style={{ background: "var(--pos)" }}></span>Local only</span>
          </div>

          {/* context selectors */}
          <div className="row gap-8 wrap" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <span className="mono-label" style={{ margin: 0 }}>Context</span>
            <select className="pill" value="" onChange={(e) => setCtx("team", e.target.value)} style={{ appearance: "auto" }}>
              <option value="">+ Team</option>{WC.TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="pill" value="" onChange={(e) => setCtx("player", e.target.value)} style={{ appearance: "auto" }}>
              <option value="">+ Player</option>{WC.PLAYERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {context && <span className="ctx-chip">{context.kind === "team" && <Crest code={context.id} size={16} />}{ctxLabel}<span className="x" onClick={() => setContext(null)}><Icon name="close" size={11} /></span></span>}
          </div>

          <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            {msgs.map((m, i) => <Bubble key={i} {...m} />)}
            {busy && <Bubble role="ai" loading />}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", padding: 14 }}>
            <div className="scroll-x" style={{ marginBottom: 10 }}>
              <div className="row gap-6 nowrap">{SUGGESTIONS.map((s) => <span key={s} className="pill" onClick={() => ask(s)}>{s}</span>)}</div>
            </div>
            <div className="row gap-10">
              <div className="searchbox" style={{ marginLeft: 0, flex: 1 }}>
                <Icon name="ai" size={15} />
                <input placeholder="Pregunta sobre partidos, equipos o jugadores…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(input); }} />
              </div>
              <button className="btn gold" disabled={busy} onClick={() => ask(input)}><Icon name="send" size={15} /></button>
            </div>
            <div className="mono-label" style={{ marginTop: 8, textAlign: "center" }}>Answers based on local cached data · no internet, no external sources</div>
          </div>
        </div>
      </div>
    );
  }
  window.AIScreen = AIAnalyst;
})();
