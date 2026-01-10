import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Calendar, 
  Users, 
  FileText, 
  ExternalLink,
  BarChart2,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';

interface Pesquisa {
  id: string;
  titulo: string;
  instituto: string;
  tipo_pesquisa: 'quantitativa' | 'qualitativa' | 'mista';
  data_campo_inicio: string | null;
  data_campo_fim: string | null;
  data_publicacao: string | null;
  registro_tse: string | null;
  universo: string | null;
  amostra_total: number | null;
  margem_erro: number | null;
  nivel_confianca: number | null;
  abrangencia: string | null;
  status: string;
  is_active: boolean;
}

interface Resultado {
  id: string;
  tipo_pergunta: string;
  pergunta: string;
  cenario_descricao: string | null;
  ordem: number;
  respostas: Resposta[];
}

interface Resposta {
  id: string;
  opcao: string;
  percentual: number | null;
  votos_absolutos: number | null;
  ordem: number;
}

interface PesquisaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pesquisa: Pesquisa | null;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const PesquisaDetailModal = ({ 
  open, 
  onOpenChange, 
  pesquisa 
}: PesquisaDetailModalProps) => {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (pesquisa && open) {
      fetchResultados();
    }
  }, [pesquisa, open]);

  const fetchResultados = async () => {
    if (!pesquisa) return;
    
    setIsLoading(true);
    try {
      const { data: resultadosData, error: resultadosError } = await supabase
        .from('pesquisa_resultados')
        .select('*')
        .eq('pesquisa_id', pesquisa.id)
        .order('ordem');

      if (resultadosError) throw resultadosError;

      if (resultadosData && resultadosData.length > 0) {
        const resultadosComRespostas = await Promise.all(
          resultadosData.map(async (resultado) => {
            const { data: respostas } = await supabase
              .from('pesquisa_respostas')
              .select('*')
              .eq('resultado_id', resultado.id)
              .order('ordem');
            
            return {
              ...resultado,
              respostas: respostas || []
            };
          })
        );
        setResultados(resultadosComRespostas);
      } else {
        setResultados([]);
      }
    } catch (error) {
      console.error('Error fetching resultados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getTipoPerguntaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      intencao_espontanea: 'Intenção de Voto (Espontânea)',
      intencao_estimulada: 'Intenção de Voto (Estimulada)',
      rejeicao: 'Rejeição',
      avaliacao_governo: 'Avaliação de Governo',
      cenario: 'Cenário',
      outro: 'Outro'
    };
    return labels[tipo] || tipo;
  };

  if (!pesquisa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            {pesquisa.titulo}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
            <TabsTrigger value="metodologia">Metodologia</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Building2 className="w-4 h-4" />
                      <span className="text-xs">Instituto</span>
                    </div>
                    <p className="font-medium">{pesquisa.instituto}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Período de Campo</span>
                    </div>
                    <p className="font-medium text-sm">
                      {formatDate(pesquisa.data_campo_inicio)} - {formatDate(pesquisa.data_campo_fim)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">Amostra</span>
                    </div>
                    <p className="font-medium">
                      {pesquisa.amostra_total?.toLocaleString() || '-'} entrevistados
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Margem de Erro</span>
                    </div>
                    <p className="font-medium">
                      ±{pesquisa.margem_erro || '-'}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <Badge variant="outline" className="ml-2">
                        {pesquisa.tipo_pesquisa}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Abrangência:</span>
                      <span className="ml-2 capitalize">{pesquisa.abrangencia}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nível de Confiança:</span>
                      <span className="ml-2">{pesquisa.nivel_confianca || 95}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Registro TSE:</span>
                      <span className="ml-2">{pesquisa.registro_tse || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Universo:</span>
                      <span className="ml-2">{pesquisa.universo || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {resultados.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Nenhum resultado cadastrado</h3>
                    <p className="text-sm text-muted-foreground">
                      Os resultados da pesquisa ainda não foram inseridos.
                      Edite a pesquisa para adicionar dados manualmente ou fazer upload de arquivo.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="resultados" className="space-y-4 mt-0">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin text-2xl">⏳</div>
                </div>
              ) : resultados.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BarChart2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Sem resultados</h3>
                    <p className="text-sm text-muted-foreground">
                      Os dados tabulados ainda não foram inseridos nesta pesquisa.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                resultados.map((resultado) => (
                  <Card key={resultado.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {resultado.pergunta}
                        </CardTitle>
                        <Badge variant="secondary">
                          {getTipoPerguntaLabel(resultado.tipo_pergunta)}
                        </Badge>
                      </div>
                      {resultado.cenario_descricao && (
                        <p className="text-sm text-muted-foreground">
                          {resultado.cenario_descricao}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {resultado.respostas.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={resultado.respostas}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis 
                              type="category" 
                              dataKey="opcao" 
                              width={90}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                              formatter={(value: number) => [`${value}%`, 'Percentual']}
                            />
                            <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                              {resultado.respostas.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Sem respostas cadastradas
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="metodologia" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Ficha Técnica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Instituto Responsável</p>
                      <p className="font-medium">{pesquisa.instituto}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Registro TSE</p>
                      <p className="font-medium">{pesquisa.registro_tse || 'Não informado'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Período de Campo</p>
                      <p className="font-medium">
                        {formatDate(pesquisa.data_campo_inicio)} a {formatDate(pesquisa.data_campo_fim)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Data de Publicação</p>
                      <p className="font-medium">{formatDate(pesquisa.data_publicacao)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Tamanho da Amostra</p>
                      <p className="font-medium">
                        {pesquisa.amostra_total?.toLocaleString() || 'Não informado'} entrevistas
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Margem de Erro</p>
                      <p className="font-medium">±{pesquisa.margem_erro || '-'}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Nível de Confiança</p>
                      <p className="font-medium">{pesquisa.nivel_confianca || 95}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Abrangência Geográfica</p>
                      <p className="font-medium capitalize">{pesquisa.abrangencia}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-sm text-muted-foreground">Universo/População</p>
                      <p className="font-medium">{pesquisa.universo || 'Não informado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
