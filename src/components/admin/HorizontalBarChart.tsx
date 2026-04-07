import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface BarDataItem {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

interface HorizontalBarChartProps {
  title: string;
  data: BarDataItem[];
  isLoading?: boolean;
  onBarClick?: (item: BarDataItem) => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(340, 82%, 52%)",
];

export function HorizontalBarChart({ title, data, isLoading = false, onBarClick }: HorizontalBarChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 40, left: 20, bottom: 5 }}
          >
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={100}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value, "Total"]}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              cursor={onBarClick ? "pointer" : undefined}
              onClick={(data) => {
                if (onBarClick && data) {
                  onBarClick(data);
                }
              }}
              label={{
                position: "right",
                fontSize: 12,
                fontWeight: 600,
                fill: "hsl(var(--foreground))",
              }}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
