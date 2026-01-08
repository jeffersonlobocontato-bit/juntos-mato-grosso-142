import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Clock, AlertCircle } from "lucide-react";

export interface BalanceData {
  eixo: string;
  realizado: number;
  em_andamento: number;
  prometido: number;
  nao_iniciado: number;
}

interface GovernmentBalanceChartProps {
  data: BalanceData[];
  isLoading?: boolean;
  onCategoryClick?: (category: 'realizado' | 'em_andamento' | 'prometido' | 'nao_iniciado', eixo?: string) => void;
}

const STATUS_CONFIG = {
  realizado: { color: "hsl(142, 76%, 36%)", label: "Realizado" },
  em_andamento: { color: "hsl(38, 92%, 50%)", label: "Em Andamento" },
  prometido: { color: "hsl(221, 83%, 53%)", label: "Prometido" },
  nao_iniciado: { color: "hsl(var(--muted-foreground))", label: "Não Iniciado" },
};

export function GovernmentBalanceChart({ data, isLoading = false, onCategoryClick }: GovernmentBalanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Balanço de Governo por Eixo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    const totalA = a.realizado + a.em_andamento + a.prometido + a.nao_iniciado;
    const totalB = b.realizado + b.em_andamento + b.prometido + b.nao_iniciado;
    return totalB - totalA;
  });

  // Calculate summary stats
  const totals = data.reduce(
    (acc, item) => ({
      realizado: acc.realizado + item.realizado,
      em_andamento: acc.em_andamento + item.em_andamento,
      prometido: acc.prometido + item.prometido,
      nao_iniciado: acc.nao_iniciado + item.nao_iniciado,
    }),
    { realizado: 0, em_andamento: 0, prometido: 0, nao_iniciado: 0 }
  );

  const total = totals.realizado + totals.em_andamento + totals.prometido + totals.nao_iniciado;
  const taxaRealizacao = total > 0 ? ((totals.realizado / total) * 100).toFixed(1) : "0";

  // Check if there's any actual data (not just zeros)
  const hasData = sortedData.some(d => 
    d.realizado > 0 || d.em_andamento > 0 || d.prometido > 0 || d.nao_iniciado > 0
  );

  if (sortedData.length === 0 || !hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Balanço de Governo por Eixo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-muted-foreground text-center">
            <AlertCircle className="h-8 w-8 mb-3 opacity-50" />
            <p className="font-medium">Nenhum dado de balanço disponível</p>
            <p className="text-xs mt-2 max-w-md">
              Os dados são calculados com base em propostas técnicas (por status) e documentos com status temporal definido.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCardClick = (category: 'realizado' | 'em_andamento' | 'prometido' | 'nao_iniciado') => {
    if (onCategoryClick && totals[category] > 0) {
      onCategoryClick(category);
    }
  };

  const handleBarClick = (data: any, category: 'realizado' | 'em_andamento' | 'prometido' | 'nao_iniciado') => {
    if (onCategoryClick && data[category] > 0) {
      onCategoryClick(category, data.eixo);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Balanço de Governo por Eixo
          {onCategoryClick && (
            <span className="text-xs font-normal text-muted-foreground ml-2">(clique nos indicadores para detalhes)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg bg-green-500/10 ${onCategoryClick && totals.realizado > 0 ? 'cursor-pointer hover:bg-green-500/20 transition-colors' : ''}`}
            onClick={() => handleCardClick('realizado')}
          >
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Realizado</p>
              <p className="font-semibold text-green-600">{totals.realizado}</p>
            </div>
          </div>
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 ${onCategoryClick && totals.em_andamento > 0 ? 'cursor-pointer hover:bg-amber-500/20 transition-colors' : ''}`}
            onClick={() => handleCardClick('em_andamento')}
          >
            <Clock className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
              <p className="font-semibold text-amber-600">{totals.em_andamento}</p>
            </div>
          </div>
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 ${onCategoryClick && totals.prometido > 0 ? 'cursor-pointer hover:bg-blue-500/20 transition-colors' : ''}`}
            onClick={() => handleCardClick('prometido')}
          >
            <TrendingDown className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Prometido</p>
              <p className="font-semibold text-blue-600">{totals.prometido}</p>
            </div>
          </div>
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 ${onCategoryClick && totals.nao_iniciado > 0 ? 'cursor-pointer hover:bg-muted transition-colors' : ''}`}
            onClick={() => handleCardClick('nao_iniciado')}
          >
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Não Iniciado</p>
              <p className="font-semibold">{totals.nao_iniciado}</p>
            </div>
          </div>
        </div>

        {/* Realization Rate */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-sm font-medium">Taxa de Realização</span>
          <span className="text-lg font-bold text-green-600">{taxaRealizacao}%</span>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="eixo"
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
                const config = STATUS_CONFIG[name as keyof typeof STATUS_CONFIG];
                return [value, config?.label || name];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const config = STATUS_CONFIG[value as keyof typeof STATUS_CONFIG];
                return config?.label || value;
              }}
            />
            <Bar 
              dataKey="realizado" 
              stackId="a" 
              fill={STATUS_CONFIG.realizado.color}
              cursor={onCategoryClick ? "pointer" : undefined}
              onClick={(data) => handleBarClick(data, 'realizado')}
            />
            <Bar 
              dataKey="em_andamento" 
              stackId="a" 
              fill={STATUS_CONFIG.em_andamento.color}
              cursor={onCategoryClick ? "pointer" : undefined}
              onClick={(data) => handleBarClick(data, 'em_andamento')}
            />
            <Bar 
              dataKey="prometido" 
              stackId="a" 
              fill={STATUS_CONFIG.prometido.color}
              cursor={onCategoryClick ? "pointer" : undefined}
              onClick={(data) => handleBarClick(data, 'prometido')}
            />
            <Bar 
              dataKey="nao_iniciado" 
              stackId="a" 
              fill={STATUS_CONFIG.nao_iniciado.color} 
              radius={[0, 4, 4, 0]}
              cursor={onCategoryClick ? "pointer" : undefined}
              onClick={(data) => handleBarClick(data, 'nao_iniciado')}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
