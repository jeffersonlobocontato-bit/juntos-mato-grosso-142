import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { CandidateResult, CANDIDATE_COLORS } from '@/data/pollsData';
import { normalizeName } from '@/lib/candidateMatch';

const NORMALIZED_COLOR_ENTRIES: Array<[string, string]> = Object.entries(CANDIDATE_COLORS).map(
  ([k, v]) => [normalizeName(k), v] as [string, string]
);

export function lookupCandidateColor(rawName: string, fallback: string): string {
  if (CANDIDATE_COLORS[rawName]) return CANDIDATE_COLORS[rawName];
  const norm = normalizeName(rawName);
  const found = NORMALIZED_COLOR_ENTRIES.find(([k]) => k === norm);
  return found ? found[1] : fallback;
}

const AUTO_PALETTE = [
  '#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#6366f1',
  '#14b8a6', '#f97316', '#22c55e', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
];

interface CandidateBarChartProps {
  results: CandidateResult[];
  /** Exclude "structural" entries like Não sabe/Não opinou */
  hideNeutral?: boolean;
  height?: number;
}

const NEUTRAL = ['Não sabe/ Não opinou', 'Não sabe/Não opinou', 'Nenhum/ Branco/ Nulo', 'Ninguém/ Branco/ Nulo'];

const tooltipStyle = {
  backgroundColor: 'hsl(220, 18%, 16%)',
  border: '1px solid hsl(220, 15%, 25%)',
  borderRadius: 10,
  fontSize: 12,
  color: '#fff',
};

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === 0) return null;
  return (
    <text
      x={x + width + 6}
      y={y + 10}
      fill="#dde4ec"
      fontSize={12}
      fontWeight={600}
    >
      {value}%
    </text>
  );
};

export function CandidateBarChart({ results, hideNeutral = false, height = 320 }: CandidateBarChartProps) {
  const filtered = results
    .filter(r => !hideNeutral || !NEUTRAL.some(n => r.candidate.includes(n.split('/')[0].trim())))
    .sort((a, b) => b.percentage - a.percentage);

  let autoIdx = 0;
  const data = filtered.map(r => ({
    name: r.candidate,
    value: r.percentage,
    color: lookupCandidateColor(r.candidate, AUTO_PALETTE[autoIdx++ % AUTO_PALETTE.length]),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,22%)" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, Math.ceil((data[0]?.value ?? 50) / 10) * 10 + 10]}
          tick={{ fontSize: 11, fill: '#8899aa' }}
          tickFormatter={v => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 12, fill: '#dde4ec' }}
        />
        <Tooltip
          formatter={(v: number) => [`${v}%`, 'Intenção']}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.9} />
          ))}
          <LabelList dataKey="value" content={<CustomLabel />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
