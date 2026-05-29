import { useMemo } from 'react';
import { Icon, Pill, Empty } from '@worldcup/ui';
import { GROUP_LETTERS } from '@worldcup/shared';
import { MatchCard } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, useTeams, useVenues } from '@/hooks';
import { useMatchFilters } from '@/store/filters';

const STATUSES = [
  { v: '', l: 'All' },
  { v: 'LIVE', l: 'Live' },
  { v: 'UPCOMING', l: 'Upcoming' },
  { v: 'FT', l: 'Final' },
];

export function MatchCenter() {
  const f = useMatchFilters();
  const { data: teamsData } = useTeams();
  const { data: venuesData } = useVenues();
  const { data, isLoading } = useMatches({
    status: f.status,
    group: f.group,
    team: f.team,
    stage: f.stage,
    venue: f.venue,
    date: f.date,
  });

  const matches = useMemo(() => data?.items ?? [], [data]);
  const stages = useMemo(() => [...new Set(matches.map((m) => m.stage))].sort(), [matches]);
  const dates = useMemo(() => [...new Set(matches.map((m) => m.date))].sort(), [matches]);

  const byDate = useMemo(() => {
    const groups: Record<string, typeof matches> = {};
    for (const m of [...matches].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))) {
      (groups[m.date] ??= []).push(m);
    }
    return groups;
  }, [matches]);

  const activeFilters = [f.status, f.group, f.team, f.stage, f.venue, f.date].filter(Boolean).length;

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="row gap-8 wrap" style={{ marginBottom: 10 }}>
          {STATUSES.map((s) => (
            <Pill key={s.v} on={f.status === s.v} onClick={() => f.set({ status: s.v })}>
              {s.l}
            </Pill>
          ))}
          {activeFilters > 0 && (
            <button type="button" className="pill" onClick={() => f.reset()}>
              <Icon name="close" size={12} /> Clear ({activeFilters})
            </button>
          )}
        </div>
        <div className="row gap-8 wrap">
          <Select value={f.group} onChange={(v) => f.set({ group: v })} label="Group">
            <option value="">All groups</option>
            {GROUP_LETTERS.map((g) => (
              <option key={g} value={g}>
                Group {g}
              </option>
            ))}
          </Select>
          <Select value={f.team} onChange={(v) => f.set({ team: v })} label="Team">
            <option value="">All teams</option>
            {(teamsData?.items ?? []).map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select value={f.stage} onChange={(v) => f.set({ stage: v })} label="Stage">
            <option value="">All stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select value={f.venue} onChange={(v) => f.set({ venue: v })} label="Venue">
            <option value="">All venues</option>
            {(venuesData?.items ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.city}
              </option>
            ))}
          </Select>
          <Select value={f.date} onChange={(v) => f.set({ date: v })} label="Date">
            <option value="">All dates</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="muted">Loading fixtures…</p>
      ) : matches.length === 0 ? (
        <Empty icon="calendar" title="No matches" text="No fixtures match the current filters." />
      ) : (
        Object.entries(byDate).map(([date, list]) => (
          <div key={date} style={{ marginBottom: 22 }}>
            <div className="section-title">
              <span className="mono-label">{date}</span>
              <h2 style={{ fontSize: 14 }}>{list.length} fixtures</h2>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
              {list.map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="pill" style={{ paddingTop: 2, paddingBottom: 2 }}>
      <span className="mono-label" style={{ margin: 0 }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--tx)',
          font: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {children}
      </select>
    </label>
  );
}
