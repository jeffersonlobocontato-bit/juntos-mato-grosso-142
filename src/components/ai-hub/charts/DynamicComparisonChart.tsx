import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DataPoint {
  date: string;
  value: number;
}

interface Series {
  name: string;
  color?: string;
  data: DataPoint[];
}

interface DynamicComparisonChartProps {
  title: string;
  series: Series[];
  showCrossings?: boolean;
}

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#6366f1',
  '#8b5cf6',
];

export const DynamicComparisonChart = ({ title, series, showCrossings = true }: DynamicComparisonChartProps) => {
  if (!series || series.length === 0) return null;

  // Transform data for recharts
  const allDates = new Set<string>();
  series.forEach(s => s.data.forEach(d => allDates.add(d.date)));
  
  const sortedDates = Array.from(allDates).sort();
  
  const chartData = sortedDates.map(date => {
    const point: Record<string, string | number> = { date };
    series.forEach(s => {
      const found = s.data.find(d => d.date === date);
      point[s.name] = found?.value ?? 0;
    });
    return point;
  });

  // Find crossing points (where lines intersect)
  const crossings: string[] = [];
  if (showCrossings && series.length >= 2 && chartData.length >= 2) {
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      
      const prevDiff = (prev[series[0].name] as number) - (prev[series[1].name] as number);
      const currDiff = (curr[series[0].name] as number) - (curr[series[1].name] as number);
      
      if (prevDiff * currDiff < 0) {
        crossings.push(curr.date as string);
      }
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.5}
              />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                labelFormatter={(label) => formatDate(label as string)}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
              
              {/* Crossing reference lines */}
              {crossings.map((date, idx) => (
                <ReferenceLine 
                  key={idx}
                  x={date}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                />
              ))}
              
              {series.map((s, idx) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {crossings.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-0.5 bg-destructive"></div>
            <span>Ponto de ultrapassagem</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
