/* icons.jsx — inline SVG icon registry */
(function () {
  const P = {
    home: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
    calendar: "M7 3v3M17 3v3M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z",
    teams: "M12 3 5 6v5c0 4.5 3 7.5 7 9.5 4-2 7-5 7-9.5V6l-7-3Z",
    players: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
    standings: "M4 6h16M4 12h16M4 18h16M7 4v16",
    bracket: "M5 5h5v5M5 19h5v-5M10 7.5h4v9h4M14 16.5h0M18 12h2",
    stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    venues: "M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    star: "M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8L12 3.5Z",
    ai: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l.9 2.4 2.4.9-2.4.9L19 22l-.9-2.4-2.4-.9 2.4-.9L19 15Z",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
    bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 13H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z",
    chevR: "M9 6l6 6-6 6", chevL: "M15 6l-6 6 6 6", chevD: "M6 9l6 6 6-6",
    menu: "M4 7h16M4 12h16M4 17h16",
    arrowL: "M19 12H5M11 18l-6-6 6-6",
    arrowR: "M5 12h14M13 6l6 6-6 6",
    ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8l3.5 2.6-1.4 4.2h-4.2L8.5 10.6 12 8Z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
    pin: "M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z",
    plus: "M12 5v14M5 12h14",
    close: "M6 6l12 12M18 6 6 18",
    filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
    whistle: "M3 11a5 5 0 1 0 10 0 5 5 0 0 0-10 0ZM13 9l8-3v4M8 11h0",
    sub: "M7 4l-4 4 4 4M3 8h11M17 20l4-4-4-4M21 16H10",
    note: "M5 3h11l4 4v14H5V3ZM15 3v5h5M9 13h7M9 17h5",
    trophy: "M7 4h10v4a5 5 0 0 1-10 0V4ZM5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3M9 16h6v3H9v-3ZM8 21h8",
    flame: "M12 22a6 6 0 0 0 6-6c0-4-3-5-3-9 0 0-3 2-3 6 0-2-1.5-3-1.5-3S8 12 8 16a4 4 0 0 0 4 6Z",
    target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    shield: "M12 3 5 6v5c0 4.5 3 7.5 7 9.5 4-2 7-5 7-9.5V6l-7-3Z",
    grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    list: "M8 6h13M8 12h13M8 18h13M3.5 6h0M3.5 12h0M3.5 18h0",
    send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
    check: "M5 12l5 5L20 7",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.5h0",
    sparkSmall: "M12 4l1.4 4.1L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4L12 4Z",
    swap: "M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4",
    present: "M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4",
    play: "M7 4v16l13-8z",
    pause: "M8 5h3v14H8zM13 5h3v14h-3z",
    cloud: "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 18 17.9Z",
    sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
    rain: "M7 16a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 18 15M8 19l-1 2M12 19l-1 2M16 19l-1 2",
    route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h6a3 3 0 0 0 3-3V9M6 15V8a3 3 0 0 1 3-3h4",
  };

  function Icon({ name, size, style, className, stroke }) {
    const d = P[name];
    const filled = ["star", "ball", "ai", "sparkSmall", "flame", "trophy", "play", "pause"].includes(name);
    if (!d) return null;
    return (
      <svg width={size || 20} height={size || 20} viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={stroke || 1.7} strokeLinecap="round" strokeLinejoin="round"
        className={className} style={style} aria-hidden="true">
        <path d={d} />
      </svg>
    );
  }
  window.Icon = Icon;
})();
