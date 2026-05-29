/* components.jsx — reusable UI primitives for the dashboard */
(function () {
  const { useContext } = React;
  const Icon = window.Icon;
  const WC = window.WC;

  // shared app context (provided by app.jsx)
  const AppCtx = React.createContext({});
  window.AppCtx = AppCtx;

  /* ---------- Flag (two-tone placeholder) ---------- */
  function Flag({ code, size = 22, round = 4 }) {
    const t = WC.teamById[code];
    if (!t) return null;
    return (
      <span className="flag" style={{ width: size * 1.4, height: size, borderRadius: round }}>
        <span style={{ background: t.colorA, clipPath: "polygon(0 0, 62% 0, 38% 100%, 0 100%)" }}></span>
        <span style={{ background: t.colorB, clipPath: "polygon(62% 0, 100% 0, 100% 100%, 38% 100%)" }}></span>
      </span>
    );
  }

  /* ---------- Crest (escudo placeholder: shield with code) ---------- */
  function Crest({ code, size = 40, slot }) {
    const t = WC.teamById[code];
    if (!t) return null;
    const fs = Math.round(size * 0.34);
    const el = (
      <span className="crest" style={{
        width: size, height: size, fontSize: fs,
        background: `linear-gradient(145deg, ${t.colorA}, ${t.colorB})`,
        borderRadius: Math.round(size * 0.22),
      }}>
        <span className="crest-code">{code}</span>
      </span>
    );
    if (!slot) return el;
    return <span className="asset-slot" style={{ display: "inline-flex" }} title="Local crest slot — falls back to generated badge">{el}<span className="slot-tag"><Icon name="shield" /></span></span>;
  }

  /* ---------- Team label (crest + name) ---------- */
  function TeamLabel({ code, size = 28, bold = true, sub, onClick }) {
    const t = WC.teamById[code];
    if (!t) return <span className="muted">TBD</span>;
    return (
      <span className="row gap-10 clickable" style={{ minWidth: 0 }} onClick={onClick}>
        <Crest code={code} size={size} />
        <span style={{ minWidth: 0 }}>
          <span style={{ fontWeight: bold ? 700 : 500, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
          {sub && <span className="mono-label" style={{ display: "block" }}>{sub}</span>}
        </span>
      </span>
    );
  }

  /* ---------- Player avatar (foto placeholder) ---------- */
  function Avatar({ player, size = 44, slot }) {
    const t = WC.teamById[player.team];
    const initials = player.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
    const el = (
      <span style={{
        width: size, height: size, borderRadius: 12, flex: "none", position: "relative",
        display: "grid", placeItems: "center", overflow: "hidden",
        background: `linear-gradient(150deg, ${t.colorA}, ${t.colorB})`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.16)",
      }}>
        <Icon name="user" size={size * 0.62} style={{ position: "absolute", bottom: -size * 0.18, color: "rgba(0,0,0,.22)" }} />
        <span className="num" style={{ position: "relative", fontWeight: 700, fontSize: size * 0.34, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>{initials}</span>
      </span>
    );
    if (!slot) return el;
    return <span className="asset-slot" style={{ display: "inline-flex" }} title="Local photo slot — falls back to initials">{el}<span className="slot-tag"><Icon name="user" /></span></span>;
  }

  /* ---------- Status badge ---------- */
  function StatusBadge({ m }) {
    if (m.status === "LIVE") return <span className="badge live"><span className="live-dot"></span>{m.minute}'</span>;
    if (m.status === "FT") return <span className="badge ft">Full Time</span>;
    return <span className="badge up">{m.time}</span>;
  }

  /* ---------- Favorite button ---------- */
  function FavStar({ kind, id, size = 18 }) {
    const ctx = useContext(AppCtx);
    const on = ctx.isFav && ctx.isFav(kind, id);
    return (
      <button className={"fav-btn" + (on ? " on" : "")} title="Favorite"
        onClick={(e) => { e.stopPropagation(); ctx.toggleFav(kind, id); }}>
        <Icon name="star" size={size} />
      </button>
    );
  }

  /* ---------- Form dots ---------- */
  function Form({ list }) {
    const f = (list || []).slice(-5);
    if (!f.length) return <span className="muted" style={{ fontSize: 11 }}>—</span>;
    return <span className="form">{f.map((r, i) => <b key={i} className={r}>{r}</b>)}</span>;
  }

  /* ---------- Match card (rich, scannable) ---------- */
  function MatchCard({ m, onOpen }) {
    const v = WC.venueById(m.venue);
    const live = m.status === "LIVE";
    const played = m.status !== "UPCOMING";
    const pH = m.possH != null ? Math.min(72, Math.max(28, m.possH)) : 50;
    return (
      <div className="card hoverable match-card" onClick={() => onOpen && onOpen(m.id)}
        style={live ? { borderColor: "color-mix(in srgb, var(--live) 45%, transparent)" } : null}>
        <div className="match-meta">
          <StatusBadge m={m} />
          <span className="mono-label" style={{ margin: 0 }}>{m.stage} · MD{m.matchday}</span>
          <span className="right row gap-6 nowrap muted"><Icon name="pin" size={12} />{v.city}</span>
        </div>
        <div className="match-row">
          <span className="match-team">
            <Crest code={m.home} size={30} />
            <span className="tname">{WC.teamById[m.home].name}</span>
          </span>
          {m.status === "UPCOMING"
            ? <span className="match-kick">{m.time}<br /><span className="mono-label">{fmtDay(m.date)}</span></span>
            : <span className="match-score"><span>{m.homeGoals}</span><span className="sep">–</span><span>{m.awayGoals}</span></span>}
          <span className="match-team away">
            <Crest code={m.away} size={30} />
            <span className="tname">{WC.teamById[m.away].name}</span>
          </span>
        </div>

        {played && m.shotsH != null && (
          <div className="mc-stats">
            <div>
              <div className="row" style={{ justifyContent: "space-between", fontSize: 10.5 }}><span className="mono-label" style={{ margin: 0 }}>Poss</span><span className="num">{pH}%</span></div>
              <div className="poss" style={{ marginTop: 4 }}><i style={{ width: pH + "%", background: "var(--gold)" }}></i><i style={{ width: (100 - pH) + "%", background: "var(--bg-hover)" }}></i></div>
            </div>
            <span className="mono-label" style={{ margin: 0 }}>·</span>
            <div style={{ textAlign: "right" }}>
              <div className="mono-label" style={{ margin: 0 }}>Shots</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>{m.shotsH}<span className="muted"> – </span>{m.shotsA}</div>
            </div>
          </div>
        )}

        <div className="mc-foot">
          <span className="mono-label" style={{ margin: 0 }}>{live ? `LIVE · ${m.minute}'` : played ? "Full time" : fmtDay(m.date) + " · " + m.time}</span>
          <span className="mc-cta">Match detail <Icon name="chevR" size={12} /></span>
        </div>
      </div>
    );
  }

  /* ---------- Compact match row ---------- */
  function MatchRow({ m, onOpen }) {
    return (
      <div className="row gap-12 clickable" style={{ padding: "10px 4px", borderBottom: "1px solid var(--line)" }}
        onClick={() => onOpen && onOpen(m.id)}>
        <span style={{ width: 58 }}><StatusBadge m={m} /></span>
        <span className="row gap-8" style={{ flex: 1, minWidth: 0 }}>
          <Crest code={m.home} size={22} />
          <span className="nowrap" style={{ fontWeight: 600, fontSize: 13 }}>{m.home}</span>
        </span>
        <span className="num" style={{ fontWeight: 700, minWidth: 44, textAlign: "center" }}>
          {m.status === "UPCOMING" ? <span className="muted" style={{ fontSize: 12 }}>{m.time}</span> : `${m.homeGoals}–${m.awayGoals}`}
        </span>
        <span className="row gap-8" style={{ flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
          <span className="nowrap" style={{ fontWeight: 600, fontSize: 13 }}>{m.away}</span>
          <Crest code={m.away} size={22} />
        </span>
      </div>
    );
  }

  /* ---------- Count-up number (skips when tab hidden -> safe in captures) ---------- */
  function CountUp({ value, dur = 900, className, style }) {
    const num = typeof value === "number" ? value : parseFloat(value);
    const isNum = !isNaN(num) && isFinite(num) && /^[-+]?[0-9.]+$/.test(String(value).trim());
    const decimals = isNum ? (String(value).split(".")[1] || "").length : 0;
    const [v, setV] = React.useState(isNum ? num : value);
    React.useEffect(() => {
      if (!isNum) { setV(value); return; }
      if (typeof document !== "undefined" && document.visibilityState === "hidden") { setV(num); return; }
      let raf, start; setV(0);
      const step = (ts) => { if (!start) start = ts; const p = Math.min(1, (ts - start) / dur); const e = 1 - Math.pow(1 - p, 3); setV(num * e); if (p < 1) raf = requestAnimationFrame(step); else setV(num); };
      raf = requestAnimationFrame(step);
      const safety = setTimeout(() => setV(num), dur + 400);
      return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
    }, [value]);
    const disp = isNum ? (decimals ? Number(v).toFixed(decimals) : Math.round(v)) : v;
    return <span className={className} style={style}>{disp}</span>;
  }

  /* ---------- Stat tile ---------- */
  function StatTile({ icon, label, value, sub, trend, spark, accent }) {
    return (
      <div className="card stat-tile">
        <div className="stat-k">
          {icon && <span style={{ color: accent || "var(--gold)" }}><Icon name={icon} size={15} /></span>}
          <span className="mono-label">{label}</span>
        </div>
        <div className="row gap-10" style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
          <span className="stat-v" style={accent ? { color: accent } : null}><CountUp value={value} /></span>
          {spark && <span className="spark">{spark.map((h, i) => <i key={i} style={{ height: `${h}%` }}></i>)}</span>}
        </div>
        <div className="row gap-8">
          {sub && <span className="stat-d">{sub}</span>}
          {trend && <span className={"trend " + (trend[0] === "-" ? "down" : "up")}>{trend}</span>}
        </div>
      </div>
    );
  }

  /* ---------- Player row / card ---------- */
  function PlayerCard({ p, onOpen, rank }) {
    const t = WC.teamById[p.team];
    return (
      <div className="card hoverable" style={{ padding: "13px 15px" }} onClick={() => onOpen && onOpen(p.id)}>
        <div className="row gap-12">
          {rank != null && <span className="num muted" style={{ width: 20, fontWeight: 700 }}>{rank}</span>}
          <Avatar player={p} size={46} slot />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-8"><span style={{ fontWeight: 700, fontSize: 14 }} className="nowrap">{p.name}</span><span className="num muted" style={{ fontSize: 11 }}>#{p.number}</span></div>
            <div className="row gap-6 muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              <Flag code={p.team} size={13} /><span className="nowrap">{t.name}</span><span>·</span><span className={"pos-tag pos-" + p.pos}>{p.pos}</span><span className="nowrap">{p.club}</span>
            </div>
          </div>
          <FavStar kind="players" id={p.id} />
        </div>
        <div className="row" style={{ marginTop: 11, paddingTop: 10, borderTop: "1px solid var(--line)", justifyContent: "space-between" }}>
          {[["G", p.goals], ["A", p.assists], ["Min", p.minutes], ["YC", p.yellow], ["Age", p.age]].map(([k, val]) => (
            <div key={k} style={{ textAlign: "center" }}><div className="num" style={{ fontWeight: 700, fontSize: 15, color: k === "G" ? "var(--gold-2)" : "var(--tx)" }}>{val}</div><div className="mono-label" style={{ margin: 0 }}>{k}</div></div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Compact player row ---------- */
  function PlayerMini({ p, onOpen, metric, rank }) {
    return (
      <div className="row gap-10 clickable" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }} onClick={() => onOpen && onOpen(p.id)}>
        {rank != null && <span className="num muted" style={{ width: 16, fontWeight: 700 }}>{rank}</span>}
        <Avatar player={p} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">{p.name}</div>
          <div className="mono-label" style={{ margin: 0 }}>{p.team} · {p.pos}</div>
        </div>
        <span className="num tx-gold" style={{ fontWeight: 700, fontSize: 15 }}>{metric ? metric(p) : p.goals}</span>
      </div>
    );
  }

  /* ---------- Team card (rich) ---------- */
  function TeamCard({ code, onOpen }) {
    const t = WC.teamById[code];
    const s = WC.STANDINGS[code];
    const goals = WC.playersByTeam(code).reduce((a, p) => a + p.goals, 0);
    const next = WC.MATCHES.find((m) => (m.home === code || m.away === code) && m.status !== "FT");
    const oppCode = next ? (next.home === code ? next.away : next.home) : null;
    return (
      <div className="card hoverable" style={{ overflow: "hidden" }} onClick={() => onOpen && onOpen(code)}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${t.colorA}, ${t.colorB})` }}></div>
        <div className="card-pad">
          <div className="row gap-12">
            <Crest code={code} size={46} slot />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row gap-8"><Flag code={code} size={14} /><span style={{ fontWeight: 700, fontSize: 15 }} className="nowrap">{t.name}</span></div>
              <div className="mono-label">Group {t.group} · FIFA #{t.ranking}</div>
            </div>
            <FavStar kind="teams" id={code} />
          </div>
          <div className="row" style={{ marginTop: 13, justifyContent: "space-between" }}>
            <div><div className="mono-label">Pts</div><div className="num" style={{ fontWeight: 700, fontSize: 17 }}>{s.Pts}</div></div>
            <div><div className="mono-label">W-D-L</div><div className="num" style={{ fontWeight: 700, fontSize: 17 }}>{s.W}-{s.D}-{s.L}</div></div>
            <div><div className="mono-label">GF</div><div className="num" style={{ fontWeight: 700, fontSize: 17 }}>{goals}</div></div>
            <div><div className="mono-label">GD</div><div className={"num " + (s.GD > 0 ? "gd-pos" : s.GD < 0 ? "gd-neg" : "")} style={{ fontWeight: 700, fontSize: 17 }}>{s.GD > 0 ? "+" : ""}{s.GD}</div></div>
            <div><div className="mono-label">Form</div><div style={{ marginTop: 3 }}><Form list={s.form} /></div></div>
          </div>
          {next && (
            <div className="tc-next" style={{ marginTop: 13 }}>
              <span className="mono-label" style={{ margin: 0 }}>Next</span>
              <Crest code={oppCode} size={20} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{WC.teamById[oppCode].name}</span>
              <span className="right mono-label" style={{ margin: 0 }}>{fmtDay(next.date)} · {next.time}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Section header ---------- */
  function Section({ title, label, action, children }) {
    return (
      <div style={{ marginBottom: 26 }}>
        <div className="section-title">
          {label && <span className="mono-label">{label}</span>}
          <h2>{title}</h2>
          {action && <span className="right">{action}</span>}
        </div>
        {children}
      </div>
    );
  }

  /* ---------- Empty / Loading ---------- */
  function Empty({ icon, title, text, action }) {
    return (
      <div className="empty">
        <span className="e-ico"><Icon name={icon || "info"} size={24} /></span>
        <h4>{title}</h4>
        {text && <p>{text}</p>}
        {action}
      </div>
    );
  }
  function Skel({ h = 60, w = "100%", r = 10, style }) {
    return <div className="skel" style={{ height: h, width: w, borderRadius: r, ...style }}></div>;
  }

  /* ---------- helpers ---------- */
  function fmtDay(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function fmtFull(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  Object.assign(window, {
    Flag, Crest, TeamLabel, Avatar, StatusBadge, FavStar, Form, CountUp,
    MatchCard, MatchRow, StatTile, PlayerCard, PlayerMini, TeamCard, Section, Empty, Skel,
    fmtDay, fmtFull,
  });
})();
