import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar } from 'lucide-react';
import { format, subMonths, subDays, startOfMonth, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DataSeries {
  key: string;
  label: string;
  color: string;
  data: { created_at: string }[];
}

interface TimelineChartProps {
  title: string;
  series: DataSeries[];
}

type Period = '7d' | '30d' | '6m' | '12m' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Último ano' },
  { value: 'all', label: 'Todo período' },
];

const TimelineChart = ({ title, series }: TimelineChartProps) => {
  const [period, setPeriod] = useState<Period>('6m');

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let granularity: 'day' | 'month';

    switch (period) {
      case '7d':
        startDate = subDays(now, 7);
        granularity = 'day';
        break;
      case '30d':
        startDate = subDays(now, 30);
        granularity = 'day';
        break;
      case '6m':
        startDate = subMonths(now, 6);
        granularity = 'month';
        break;
      case '12m':
        startDate = subMonths(now, 12);
        granularity = 'month';
        break;
      case 'all':
      default:
        // Find earliest date across all series
        let earliest = now;
        series.forEach(s => {
          s.data.forEach(item => {
            const date = new Date(item.created_at);
            if (date < earliest) earliest = date;
          });
        });
        startDate = startOfMonth(earliest);
        granularity = 'month';
        break;
    }

    // Create time buckets
    const buckets: Record<string, Record<string, number>> = {};
    
    if (granularity === 'day') {
      // Create daily buckets
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        const key = format(d, 'yyyy-MM-dd');
        buckets[key] = {};
        series.forEach(s => {
          buckets[key][s.key] = 0;
        });
      }
    } else {
      // Create monthly buckets
      for (let d = new Date(startDate); d <= now; d.setMonth(d.getMonth() + 1)) {
        const key = format(d, 'yyyy-MM');
        buckets[key] = {};
        series.forEach(s => {
          buckets[key][s.key] = 0;
        });
      }
    }

    // Fill buckets with data
    series.forEach(s => {
      s.data.forEach(item => {
        const date = new Date(item.created_at);
        if (!isAfter(date, startDate) && period !== 'all') return;
        
        const key = granularity === 'day' 
          ? format(date, 'yyyy-MM-dd')
          : format(date, 'yyyy-MM');
        
        if (buckets[key]) {
          buckets[key][s.key] = (buckets[key][s.key] || 0) + 1;
        }
      });
    });

    // Convert to array and calculate cumulative totals
    const entries = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b));
    
    // Calculate cumulative values
    const cumulative: Record<string, number> = {};
    series.forEach(s => {
      cumulative[s.key] = 0;
    });

    return entries.map(([key, values]) => {
      const result: Record<string, any> = {
        name: granularity === 'day' 
          ? format(parseISO(key), 'dd/MM', { locale: ptBR })
          : format(parseISO(key + '-01'), 'MMM', { locale: ptBR }),
      };

      series.forEach(s => {
        cumulative[s.key] += values[s.key] || 0;
        result[s.key] = cumulative[s.key];
      });

      return result;
    });
  }, [series, period]);

  if (series.every(s => s.data.length === 0)) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          Sem dados para exibir
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              {series.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineChart;
