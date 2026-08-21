import { CrossTab } from '@/data/pollsData';
import { cn } from '@/lib/utils';
import { lookupCandidateColor } from './CandidateBarChart';

interface CrossTabTableProps {
  crossTab: CrossTab;
  highlightCandidate?: string;
}

function getIntensity(value: number, rowValues: number[]): 'high' | 'mid' | 'low' | 'neutral' {
  const sorted = [...rowValues].sort((a, b) => b - a);
  const max = sorted[0];
  const min = sorted[sorted.length - 1];
  const range = max - min;
  if (range < 3) return 'neutral';
  if (value === max) return 'high';
  if (value <= min + range * 0.25) return 'low';
  if (value >= max - range * 0.25) return 'high';
  return 'mid';
}

export function CrossTabTable({ crossTab, highlightCandidate }: CrossTabTableProps) {
  const { candidates, rows } = crossTab;

  return (
    <div className="overflow-x-auto rounded-lg border border-[hsl(220,15%,20%)]">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-[hsl(220,15%,20%)] bg-[hsl(220,18%,16%)]">
            <th className="py-2 px-3 text-left font-semibold text-[#8899aa] whitespace-nowrap min-w-[130px]">
              {crossTab.filterLabel}
            </th>
            {candidates.map(c => (
              <th
                key={c}
                className={cn(
                  'py-2 px-2 text-center font-semibold whitespace-nowrap',
                  highlightCandidate === c ? 'text-[#0FFCBE]' : 'text-[#8899aa]',
                )}
                style={{ borderLeft: `3px solid ${lookupCandidateColor(c, 'transparent')}` }}
              >
                {c.length > 16 ? c.split(' ').slice(0, 2).join(' ') : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const rowNums = candidates.map(c => row.values[c] ?? 0);
            return (
              <tr
                key={ri}
                className={cn(
                  'border-b border-[hsl(220,15%,20%)] last:border-0',
                  ri % 2 === 0 ? 'bg-[hsl(220,20%,13%)]' : 'bg-[hsl(220,18%,15%)]'
                )}
              >
                <td className="py-1.5 px-3 font-medium text-[#dde4ec] whitespace-nowrap">{row.label}</td>
                {candidates.map((c, ci) => {
                  const val = row.values[c] ?? 0;
                  const intensity = getIntensity(val, rowNums);
                  const isHighlighted = highlightCandidate === c;

                  let cellBg = '';
                  if (intensity === 'high') cellBg = 'bg-[#0FFCBE]/15';
                  else if (intensity === 'low') cellBg = 'bg-[#E53935]/15';

                  return (
                    <td
                      key={ci}
                      className={cn(
                        'py-1.5 px-2 text-center font-semibold tabular-nums transition-colors',
                        cellBg,
                        isHighlighted && 'ring-1 ring-inset ring-[#0FFCBE]/40',
                        intensity === 'high' ? 'text-[#0FFCBE]' : intensity === 'low' ? 'text-[#E53935]' : 'text-[#dde4ec]',
                      )}
                    >
                      {val > 0 ? `${val.toFixed(1)}%` : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
