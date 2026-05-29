/**
 * Pure presentational primitives. Driven entirely by props — no global data, no
 * store coupling — so they live in the shared UI package. They use the global CSS
 * classes from the web app's tokens/stylesheet plus a few inline styles.
 *
 * Crest / Flag / Avatar implement the "slot" pattern: if a local asset URL is
 * provided, render it and fall back to the generated placeholder on error.
 */
import { Star } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from './icons';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type Status = 'UPCOMING' | 'LIVE' | 'FT';

/* ---------- Crest (generated escudo + optional local asset) ---------- */
export interface CrestProps {
  code: string;
  colorA?: string;
  colorB?: string;
  size?: number;
  src?: string | null;
}
export function Crest({ code, colorA = '#2a3550', colorB = '#566080', size = 40, src }: CrestProps) {
  const [ok, setOk] = useState(Boolean(src));
  useEffect(() => setOk(Boolean(src)), [src]);
  if (src && ok) {
    return (
      <img
        src={src}
        alt={code}
        width={size}
        height={size}
        className="crest"
        style={{ borderRadius: Math.round(size * 0.22), objectFit: 'cover' }}
        onError={() => setOk(false)}
      />
    );
  }
  return (
    <span
      className="crest"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        background: `linear-gradient(145deg, ${colorA}, ${colorB})`,
        borderRadius: Math.round(size * 0.22),
      }}
    >
      <span className="crest-code">{code}</span>
    </span>
  );
}

/* ---------- Flag (two-tone chip + optional local asset) ---------- */
export interface FlagProps {
  code: string;
  colorA?: string;
  colorB?: string;
  size?: number;
  round?: number;
  src?: string | null;
}
export function Flag({ code, colorA = '#2a3550', colorB = '#566080', size = 22, round = 4, src }: FlagProps) {
  const [ok, setOk] = useState(Boolean(src));
  useEffect(() => setOk(Boolean(src)), [src]);
  if (src && ok) {
    return (
      <img
        src={src}
        alt={`${code} flag`}
        className="flag"
        style={{ width: size * 1.4, height: size, borderRadius: round, objectFit: 'cover' }}
        onError={() => setOk(false)}
      />
    );
  }
  return (
    <span className="flag" style={{ width: size * 1.4, height: size, borderRadius: round }}>
      <span style={{ background: colorA, clipPath: 'polygon(0 0, 62% 0, 38% 100%, 0 100%)' }} />
      <span style={{ background: colorB, clipPath: 'polygon(62% 0, 100% 0, 100% 100%, 38% 100%)' }} />
    </span>
  );
}

/* ---------- Avatar (player photo slot + initials fallback) ---------- */
export interface AvatarProps {
  name: string;
  colorA?: string;
  colorB?: string;
  size?: number;
  src?: string | null;
}
export function Avatar({ name, colorA = '#2a3550', colorB = '#566080', size = 44, src }: AvatarProps) {
  const [ok, setOk] = useState(Boolean(src));
  useEffect(() => setOk(Boolean(src)), [src]);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
  if (src && ok) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: 12, objectFit: 'cover', flex: 'none' }}
        onError={() => setOk(false)}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        flex: 'none',
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        background: `linear-gradient(150deg, ${colorA}, ${colorB})`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)',
      }}
    >
      <span
        className="num"
        style={{
          position: 'relative',
          fontWeight: 700,
          fontSize: size * 0.34,
          color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,.5)',
        }}
      >
        {initials}
      </span>
    </span>
  );
}

/* ---------- Status badge ---------- */
export function StatusBadge({ status, minute, time }: { status: Status; minute?: number | null; time?: string }) {
  if (status === 'LIVE')
    return (
      <span className="badge live">
        <span className="live-dot" />
        {minute ?? 0}&apos;
      </span>
    );
  if (status === 'FT') return <span className="badge ft">Full Time</span>;
  return <span className="badge up">{time ?? 'TBD'}</span>;
}

/* ---------- Form dots ---------- */
export function Form({ list }: { list: string[] }) {
  const f = (list ?? []).slice(-5);
  if (!f.length) return <span className="muted" style={{ fontSize: 11 }}>—</span>;
  return (
    <span className="form">
      {f.map((r, i) => (
        <b key={i} className={r}>
          {r}
        </b>
      ))}
    </span>
  );
}

/* ---------- Favorite button (pure; wired to store by the web app) ---------- */
export function FavButton({
  active,
  onClick,
  size = 18,
}: {
  active: boolean;
  onClick: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      className={cn('fav-btn', active && 'on')}
      title="Favorite"
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Star size={size} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

/* ---------- Count-up number ---------- */
export function CountUp({ value, dur = 800, className, style }: { value: number | string; dur?: number; className?: string; style?: CSSProperties }) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  const isNum = !Number.isNaN(num) && Number.isFinite(num) && /^[-+]?[0-9.]+$/.test(String(value).trim());
  const decimals = isNum ? (String(value).split('.')[1] || '').length : 0;
  const [v, setV] = useState<number | string>(isNum ? num : value);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!isNum) {
      setV(value);
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      setV(num);
      return;
    }
    let start: number | null = null;
    setV(0);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(num * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setV(num);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const disp = isNum ? (decimals ? Number(v).toFixed(decimals) : Math.round(Number(v))) : v;
  return (
    <span className={className} style={style}>
      {disp}
    </span>
  );
}

/* ---------- Stat tile ---------- */
export interface StatTileProps {
  icon?: IconName;
  label: string;
  value: number | string;
  sub?: string;
  trend?: string;
  spark?: number[];
  accent?: string;
}
export function StatTile({ icon, label, value, sub, trend, spark, accent }: StatTileProps) {
  return (
    <div className="card stat-tile">
      <div className="stat-k">
        {icon && (
          <span style={{ color: accent || 'var(--gold)' }}>
            <Icon name={icon} size={15} />
          </span>
        )}
        <span className="mono-label">{label}</span>
      </div>
      <div className="row gap-10" style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span className="stat-v" style={accent ? { color: accent } : undefined}>
          <CountUp value={value} />
        </span>
        {spark && (
          <span className="spark">
            {spark.map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </span>
        )}
      </div>
      <div className="row gap-8">
        {sub && <span className="stat-d">{sub}</span>}
        {trend && <span className={cn('trend', trend.startsWith('-') ? 'down' : 'up')}>{trend}</span>}
      </div>
    </div>
  );
}

/* ---------- Badge / Pill ---------- */
export function Badge({ children, variant }: { children: ReactNode; variant?: 'live' | 'gold' | 'ft' | 'up' }) {
  return <span className={cn('badge', variant)}>{children}</span>;
}

export function Pill({ children, on, onClick }: { children: ReactNode; on?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={cn('pill', on && 'on')} onClick={onClick}>
      {children}
    </button>
  );
}

/* ---------- Section header ---------- */
export function Section({
  title,
  label,
  action,
  children,
}: {
  title: string;
  label?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
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

/* ---------- Empty / Skeleton ---------- */
export function Empty({ icon, title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="e-ico">
        <Icon name={icon ?? 'info'} size={24} />
      </span>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ h = 60, w = '100%', r = 10, style }: { h?: number; w?: number | string; r?: number; style?: CSSProperties }) {
  return <div className="skel" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}
