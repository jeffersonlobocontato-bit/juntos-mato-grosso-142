import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GitCompare, TrendingUp, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';

interface EixoData {
  id: string;
  nome: string;
  propostas: number;
  aprovadas: number;
  atrasadas: number;
  sugestoes: number;
  rascunho: number;
  em_analise: number;
}

interface EixoComparisonPanelProps {
  eixosData: EixoData[];
  isLoading?: boolean;
  selectedEixos?: string[];
  onSelectionChange?: (eixos: string[]) => void;
}

const EIXO_COLORS: Record<string, string> = {
  'Desenvolvimento Social': '#3B82F6',
  'Desenvolvimento Econômico Sustentável': '#22C55E',
  'Desenvolvimento das Cidades e Infraestrutura': '#F59E0B',
  'Gestão Pública Eficiente': '#8B5CF6',
  'Segurança, Justiça, Combate à Corrupção': '#EF4444',
};

export function EixoComparisonPanel({ 
  eixosData, 
  isLoading = false,
  selectedEixos: externalSelectedEixos,
  onSelectionChange
}: EixoComparisonPanelProps) {
  const [internalSelectedEixos, setInternalSelectedEixos] = useState<string[]>([]);
  
  // Use external state if provided, otherwise use internal state
  const selectedEixos = externalSelectedEixos ?? internalSelectedEixos;
  const setSelectedEixos = onSelectionChange ?? setInternalSelectedEixos;

  const toggleEixo = (eixoId: string) => {
    if (selectedEixos.includes(eixoId)) {
      setSelectedEixos(selectedEixos.filter(id => id !== eixoId));
    } else if (selectedEixos.length < 4) {
      setSelectedEixos([...selectedEixos, eixoId]);
    }
  };

  const selectedData = useMemo(() => {
    if (selectedEixos.length === 0) return eixosData;
    return eixosData.filter(e => selectedEixos.includes(e.id));
  }, [eixosData, selectedEixos]);

  const chartData = useMemo(() => {
    return selectedData.map(e => ({
      name: e.nome.split(' ').slice(0, 2).join(' '),
      fullName: e.nome,
      Propostas: e.propostas,
      Aprovadas: e.aprovadas,
      Atrasadas: e.atrasadas,
      Sugestões: e.sugestoes,
    }));
  }, [selectedData]);

  const totals = useMemo(() => {
    return selectedData.reduce(
      (acc, e) => ({
        propostas: acc.propostas + e.propostas,
        aprovadas: acc.aprovadas + e.aprovadas,
        atrasadas: acc.atrasadas + e.atrasadas,
        sugestoes: acc.sugestoes + e.sugestoes,
      }),
      { propostas: 0, aprovadas: 0, atrasadas: 0, sugestoes: 0 }
    );
  }, [selectedData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparativo entre Eixos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparativo entre Eixos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione até 4 eixos para comparar
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Eixo Selection */}
        <div className="flex flex-wrap gap-2">
          {eixosData.map(eixo => (
            <label
              key={eixo.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                selectedEixos.includes(eixo.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              } ${selectedEixos.length >= 4 && !selectedEixos.includes(eixo.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Checkbox
                checked={selectedEixos.includes(eixo.id)}
                onCheckedChange={() => toggleEixo(eixo.id)}
                disabled={selectedEixos.length >= 4 && !selectedEixos.includes(eixo.id)}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: EIXO_COLORS[eixo.nome] || '#888' }}
              />
              <span className="text-sm font-medium">{eixo.nome}</span>
            </label>
          ))}
        </div>

        {/* Summary Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Total Propostas</span>
            </div>
            <p className="text-2xl font-bold">{totals.propostas}</p>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Aprovadas</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{totals.aprovadas}</p>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Atrasadas</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{totals.atrasadas}</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Sugestões</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{totals.sugestoes}</p>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedData.map(eixo => {
            const taxaAprovacao = eixo.propostas > 0 
              ? Math.round((eixo.aprovadas / eixo.propostas) * 100) 
              : 0;

            return (
              <Card key={eixo.id} className="border-l-4" style={{ borderLeftColor: EIXO_COLORS[eixo.nome] || '#888' }}>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm line-clamp-2">{eixo.nome}</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Propostas</span>
                      <span className="font-medium">{eixo.propostas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aprovadas</span>
                      <span className="font-medium text-green-600">{eixo.aprovadas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atrasadas</span>
                      <span className={`font-medium ${eixo.atrasadas > 0 ? 'text-red-600' : ''}`}>
                        {eixo.atrasadas}
                        {eixo.atrasadas > 0 && ' ⚠️'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sugestões</span>
                      <span className="font-medium">{eixo.sugestoes}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Taxa de Aprovação</span>
                      <span className="font-medium">{taxaAprovacao}%</span>
                    </div>
                    <Progress value={taxaAprovacao} className="h-2" />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs bg-gray-100">
                      {eixo.rascunho} rasc.
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-blue-100">
                      {eixo.em_analise} análise
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Comparative Chart */}
        {selectedData.length > 0 && (
          <div className="h-[300px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                />
                <Legend />
                <Bar dataKey="Propostas" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Aprovadas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Atrasadas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sugestões" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
