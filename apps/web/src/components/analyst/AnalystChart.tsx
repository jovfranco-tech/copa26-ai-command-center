import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Icon } from '@worldcup/ui';

export interface ParsedAnswer {
  text: string;
  chart?: {
    type: 'bar' | 'line';
    title: string;
    keys: string[];
    data: Array<{ name: string; [key: string]: number | string }>;
  } | null;
}

// Co-located with its chart component on purpose; this only affects HMR granularity.
// eslint-disable-next-line react-refresh/only-export-components
export function parseAIAnswer(text: string): ParsedAnswer {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const cleanText = text.replace(/```json\s*([\s\S]*?)\s*```/, '').trim();
      return { text: cleanText, chart: parsed.chart };
    } catch (e) {
      console.error('Failed to parse Generative UI chart JSON', e);
    }
  }
  return { text, chart: null };
}

export function AnalystChart({ chart }: { chart: NonNullable<ParsedAnswer['chart']> }) {
  if (!chart || !chart.data || !chart.data.length || !chart.keys || !chart.keys.length) return null;

  const key = chart.keys[0]!;

  return (
    <div className="card" style={{ marginTop: 14, border: '1px solid var(--gold-line)', background: 'var(--bg-2)' }}>
      <div className="card-hd" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <Icon name="stats" size={14} style={{ color: 'var(--gold)' }} />
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{chart.title}</h4>
      </div>
      <div className="card-pad" style={{ height: 220, paddingTop: 14 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--gold-2)' }}
              />
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey={key} stroke="var(--gold)" strokeWidth={2.5} activeDot={{ r: 6 }} />
            </LineChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--gold-2)' }}
              />
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <Bar dataKey={key} fill="var(--gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
