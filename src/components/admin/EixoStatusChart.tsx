import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface EixoStatusData {
  name: string;
  rascunho: number;
  em_analise: number;
  aprovada: number;
  total: number;
}

interface EixoStatusChartProps {
  title: string;
  data: EixoStatusData[];
  isLoading?: boolean;
}

const STATUS_COLORS = {
  rascunho: "hsl(var(--muted-foreground))",
  em_analise: "hsl(221, 83%, 53%)",
  aprovada: "hsl(142, 76%, 36%)",
};

export function EixoStatusChart({ title, data, isLoading = false }: EixoStatusChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  if (sortedData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Nenhuma proposta encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  rascunho: "Rascunho",
                  em_analise: "Em Análise",
                  aprovada: "Aprovada",
                };
                return [value, labels[name] || name];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  rascunho: "Rascunho",
                  em_analise: "Em Análise",
                  aprovada: "Aprovada",
                };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="rascunho" stackId="a" fill={STATUS_COLORS.rascunho} radius={[0, 0, 0, 0]} />
            <Bar dataKey="em_analise" stackId="a" fill={STATUS_COLORS.em_analise} radius={[0, 0, 0, 0]} />
            <Bar dataKey="aprovada" stackId="a" fill={STATUS_COLORS.aprovada} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
