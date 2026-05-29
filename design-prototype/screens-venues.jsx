/* screens-venues.jsx — Venues grid + Venue detail (map, weather, distances) */
(function () {
  const { useContext, useState, useMemo } = React;
  const Icon = window.Icon, WC = window.WC;
  const { Crest, Empty, Section, fmtFull, fmtDay } = window;

  // approximate normalized map positions over a North America bounding box
  const GEO = {
    sea: [17, 22], van: [15, 17], sf: [13, 43], lax: [17, 52],
    dal: [54, 60], hou: [56, 67], kc: [60, 45], atl: [73, 54],
    mia: [79, 70], nyc: [80, 37], phi: [78, 40], bos: [83, 32], tor: [75, 33],
    mex: [52, 82], gdl: [46, 80], mty: [55, 70],
  };
  function dist(a, b) {
    const [ax, ay] = GEO[a] || [50, 50], [bx, by] = GEO[b] || [50, 50];
    return Math.round(Math.hypot(ax - bx, ay - by) * 52);
  }
  function seed(s, i) { const x = Math.sin((s.charCodeAt(0) + s.charCodeAt(1) + i * 6.3) * 2.1) * 10000; return x - Math.floor(x); }
  function weather(v) {
    return Array.from({ length: 4 }, (_, i) => {
      const r = seed(v.id, i);
      const cond = r > 0.7 ? "rain" : r > 0.4 ? "cloud" : "sun";
      const hi = 22 + Math.round(seed(v.id, i + 10) * 12);
      return { cond, hi, lo: hi - 6 - Math.round(seed(v.id, i + 20) * 4), day: ["Today", "Fri", "Sat", "Sun"][i] };
    });
  }

  function VenuePlaceholder({ v, h = 110 }) {
    return (
      <div className="asset-slot" style={{ height: h, position: "relative", overflow: "hidden", background: "linear-gradient(180deg, var(--bg-3), var(--bg-1))" }} title="Local venue image slot (optional)">
        <svg viewBox="0 0 300 110" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <ellipse cx="150" cy="135" rx="150" ry="55" fill="none" stroke="var(--gold-line)" strokeWidth="1.5" opacity="0.5" />
          <ellipse cx="150" cy="150" rx="110" ry="42" fill="none" stroke="var(--line-2)" strokeWidth="1" />
          <line x1="150" y1="108" x2="150" y2="60" stroke="var(--line-2)" strokeWidth="1" />
        </svg>
        <div style={{ position: "absolute", top: 12, left: 14 }}><span className="badge"><Icon name="pin" size={11} />{v.country}</span></div>
        <div style={{ position: "absolute", bottom: 10, right: 14 }} className="mono-label">Local image optional</div>
      </div>
    );
  }

  function MiniMap({ active, onPick }) {
    return (
      <div style={{ position: "relative", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "radial-gradient(120% 90% at 50% 0%, var(--bg-3), var(--bg-1))", aspectRatio: "16/11", overflow: "hidden" }}>
        <div className="mono-label" style={{ position: "absolute", top: 8, left: 10, margin: 0 }}>USA · Canada · Mexico</div>
        {WC.VENUES.map((v) => {
          const [x, y] = GEO[v.id] || [50, 50];
          const on = v.id === active;
          return (
            <div key={v.id} title={v.city} onClick={() => onPick && onPick(v.id)}
              style={{ position: "absolute", left: x + "%", top: y + "%", transform: "translate(-50%,-50%)", cursor: "pointer", zIndex: on ? 3 : 1 }}>
              <span style={{ display: "block", width: on ? 13 : 8, height: on ? 13 : 8, borderRadius: "50%", background: on ? "var(--gold)" : "var(--tx-3)", boxShadow: on ? "0 0 0 4px var(--gold-soft)" : "none", transition: "all .15s" }}></span>
              {on && <span className="mono-label" style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", margin: 0, whiteSpace: "nowrap", color: "var(--gold-2)" }}>{v.city}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  function Venues() {
    const ctx = useContext(AppCtx);
    const [country, setCountry] = useState("all");
    const countries = ["all", "USA", "Canada", "Mexico"];
    const list = WC.VENUES.filter((v) => country === "all" || v.country === country);
    return (
      <div className="page-fade">
        <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 340px", gap: "var(--gap)", alignItems: "start", marginBottom: 4 }}>
          <div>
            <div className="row gap-6 wrap" style={{ marginBottom: 16 }}>
              {countries.map((c) => <span key={c} className={"pill" + (country === c ? " on" : "")} onClick={() => setCountry(c)}>{c === "all" ? "All host nations" : c}</span>)}
              <span className="right mono-label">{list.length} venues</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
              {list.map((v) => {
                const ms = WC.MATCHES.filter((m) => m.venue === v.id);
                return (
                  <div key={v.id} className="card hoverable" style={{ overflow: "hidden" }} onClick={() => ctx.nav("venue", { id: v.id })}>
                    <VenuePlaceholder v={v} />
                    <div className="card-pad">
                      <div style={{ fontWeight: 700, fontSize: 15 }} className="nowrap">{v.stadium}</div>
                      <div className="mono-label" style={{ marginTop: 2 }}>{v.city}, {v.country}</div>
                      <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
                        <div><div className="mono-label">Capacity</div><div className="num" style={{ fontWeight: 700 }}>{(v.capacity / 1000).toFixed(0)}k</div></div>
                        <div><div className="mono-label">Surface</div><div style={{ fontWeight: 600, fontSize: 13 }}>{v.surface}</div></div>
                        <div><div className="mono-label">Matches</div><div className="num" style={{ fontWeight: 700 }}>{ms.length}</div></div>
                        <span className="mc-cta" style={{ alignSelf: "flex-end" }}>Open <Icon name="chevR" size={12} /></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card" style={{ position: "sticky", top: 74 }}>
            <div className="card-hd"><Icon name="pin" size={15} style={{ color: "var(--gold)" }} /><h3>Host map</h3><span className="spacer"></span><span className="mono-label" style={{ margin: 0 }}>16 cities</span></div>
            <div className="card-pad"><MiniMap onPick={(id) => ctx.nav("venue", { id })} /></div>
          </div>
        </div>
      </div>
    );
  }

  function VenueDetail({ id }) {
    const ctx = useContext(AppCtx);
    const v = WC.venueById(id);
    if (!v) return <Empty icon="info" title="Venue not found" />;
    const ms = WC.MATCHES.filter((m) => m.venue === id);
    const wx = useMemo(() => weather(v), [id]);
    const others = WC.VENUES.filter((x) => x.id !== id).map((x) => ({ ...x, km: dist(id, x.id) })).sort((a, b) => a.km - b.km).slice(0, 5);
    const wIcon = { sun: "sun", cloud: "cloud", rain: "rain" };

    return (
      <div className="page-fade">
        <button className="btn ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => ctx.back()}><Icon name="arrowL" size={15} /> Back</button>
        <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
          <VenuePlaceholder v={v} h={150} />
          <div className="card-pad">
            <div className="row gap-12 wrap" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>{v.stadium}</div>
                <div className="mono-label" style={{ marginTop: 2 }}>{v.city}, {v.country}</div>
              </div>
              <div className="row gap-16 wrap">
                <div><div className="mono-label">Capacity</div><div className="num" style={{ fontWeight: 700, fontSize: 19 }}>{v.capacity.toLocaleString()}</div></div>
                <div><div className="mono-label">Surface</div><div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{v.surface}</div></div>
                <div><div className="mono-label">Matches</div><div className="num" style={{ fontWeight: 700, fontSize: 19 }}>{ms.length}</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", marginBottom: 18 }}>
          <div className="card">
            <div className="card-hd"><Icon name="pin" size={15} style={{ color: "var(--gold)" }} /><h3>Location</h3></div>
            <div className="card-pad"><MiniMap active={id} onPick={(vid) => ctx.nav("venue", { id: vid })} /></div>
          </div>
          <div className="card">
            <div className="card-hd"><Icon name="sun" size={15} style={{ color: "var(--gold)" }} /><h3>Matchday forecast</h3><span className="spacer"></span><span className="mono-label" style={{ margin: 0 }}>°C</span></div>
            <div className="card-pad">
              <div className="row" style={{ justifyContent: "space-between" }}>
                {wx.map((w, i) => (
                  <div key={i} style={{ textAlign: "center", flex: 1 }}>
                    <div className="mono-label" style={{ margin: 0 }}>{w.day}</div>
                    <div style={{ color: w.cond === "sun" ? "var(--warn)" : w.cond === "rain" ? "#6ea0ff" : "var(--tx-2)", margin: "8px 0" }}><Icon name={wIcon[w.cond]} size={26} /></div>
                    <div className="num" style={{ fontWeight: 700 }}>{w.hi}°</div>
                    <div className="mono-label" style={{ margin: 0 }}>{w.lo}°</div>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 11, marginTop: 12, marginBottom: 0 }}>Indicative local conditions from cached data.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-hd"><Icon name="route" size={15} style={{ color: "var(--gold)" }} /><h3>Nearest venues</h3></div>
            <div className="card-pad" style={{ paddingTop: 4 }}>
              {others.map((o) => (
                <div key={o.id} className="row gap-10 clickable" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }} onClick={() => ctx.nav("venue", { id: o.id })}>
                  <Icon name="pin" size={13} style={{ color: "var(--tx-3)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13 }} className="nowrap">{o.city}</div><div className="mono-label" style={{ margin: 0 }}>{o.country}</div></div>
                  <span className="num tx-gold" style={{ fontWeight: 700 }}>{o.km}<span className="muted" style={{ fontSize: 10 }}> km</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Section title="Assigned fixtures" label={ms.length + " matches"}>
          <div className="card card-pad">
            {ms.length === 0 && <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>No fixtures assigned to this venue.</p>}
            {ms.map((m) => (
              <div key={m.id} className="row gap-10 clickable" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }} onClick={() => ctx.nav("match", { id: m.id })}>
                <span className="mono-label" style={{ width: 64, margin: 0 }}>{fmtDay(m.date)}</span>
                <Crest code={m.home} size={22} /><span style={{ fontSize: 13, fontWeight: 600 }}>{m.home}</span>
                <span className="num muted" style={{ minWidth: 40, textAlign: "center" }}>{m.status === "UPCOMING" ? m.time : `${m.homeGoals}–${m.awayGoals}`}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.away}</span><Crest code={m.away} size={22} />
                <span className="right mono-label" style={{ margin: 0 }}>{m.stage}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  window.VenuesScreen = Venues;
  window.VenueDetailScreen = VenueDetail;
})();
