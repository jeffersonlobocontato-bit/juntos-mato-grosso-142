import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type BarChartData = Record<string, string | number | undefined>;

interface DynamicBarChartProps {
  title: string;
  data: BarChartData[];
  keys?: string[];
}

const DEFAULT_COLORS = [
  '#16a34a', // green
  '#2563eb', // blue
  '#dc2626', // red
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // violet
];

export const DynamicBarChart = ({ title, data, keys }: DynamicBarChartProps) => {
  if (!data || data.length === 0) return null;

  // Auto-detect keys if not provided
  const dataKeys = keys || Object.keys(data[0] || {}).filter(k => k !== 'category' && k !== 'name');
  
  // Handle simple data format (name, value)
  const isSimpleFormat = 'name' in (data[0] || {}) && 'value' in (data[0] || {});
  
  if (isSimpleFormat) {
    const simpleData = data as unknown as Array<{ name: string; value: number }>;
    return (
      <Card className="h-full">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={simpleData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  tickFormatter={(val) => `${val}%`}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string, props: { payload?: { name?: string } }) => [
                    `${Number(value).toFixed(1)}%`, 
                    props.payload?.name || name
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  payload={simpleData.map((entry, index) => ({
                    value: entry.name,
                    type: 'square' as const,
                    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                  }))}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 4, 4, 0]}
                >
                  {simpleData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Complex format with multiple keys per category
  // Detect category key - could be "category", "name", "label", or "candidato"
  const categoryKey = 'category' in (data[0] || {}) ? 'category' 
    : 'name' in (data[0] || {}) ? 'name' 
    : 'label' in (data[0] || {}) ? 'label'
    : 'candidato' in (data[0] || {}) ? 'candidato'
    : Object.keys(data[0] || {}).find(k => typeof data[0][k] === 'string') || 'category';

  // Filter out the category key from dataKeys
  const filteredDataKeys = dataKeys.filter(k => k !== categoryKey);

  // Create legend payload with category names and colors
  const legendPayload = data.map((entry, index) => ({
    value: String(entry[categoryKey] || `Item ${index + 1}`),
    type: 'square' as const,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis 
                dataKey={categoryKey}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string, props: { payload?: Record<string, unknown> }) => [
                  `${Number(value).toFixed(1)}%`, 
                  props.payload?.[categoryKey] ? String(props.payload[categoryKey]) : name
                ]}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                payload={legendPayload}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
              {filteredDataKeys.map((key, idx) => (
                <Bar 
                  key={key}
                  dataKey={key}
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
