import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LeadsOriginChartProps {
  data: {
    date: string;
    formulario: number;
    chatbot: number;
    proposta: number;
  }[];
  isLoading?: boolean;
}

export function LeadsOriginChart({ data, isLoading = false }: LeadsOriginChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Leads por Origem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Leads por Origem</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              dataKey="formulario"
              name="Formulário"
              stackId="a"
              fill="hsl(var(--primary))"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="chatbot"
              name="Chatbot"
              stackId="a"
              fill="hsl(142, 76%, 36%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="proposta"
              name="Proposta"
              stackId="a"
              fill="hsl(38, 92%, 50%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
