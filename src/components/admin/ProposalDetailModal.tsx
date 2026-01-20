import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScoreBadge } from "./ScoreBadge";
import { EvaluationBreakdown } from "./EvaluationBreakdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Save, X, FileText, Brain, Info } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Proposal {
  id: string;
  titulo: string;
  descricao: string;
  status: 'rascunho' | 'validada' | 'consolidada' | 'aprovada';
  etapa: number;
  eixo_id: string;
  municipio_id: string | null;
  autor_id: string;
  lider_responsavel_id: string | null;
  entrevistado: string | null;
  metas: string | null;
  indicadores: string | null;
  questionario: Json | null;
  created_at: string;
  updated_at: string;
}

interface Evaluation {
  id: string;
  score_total: number;
  scores: {
    viabilidade_tecnica?: number;
    aderencia_popular?: number;
    relevancia_eleitoral?: number;
    coerencia_programatica?: number;
    impacto_regional?: number;
  };
  justificativa: string | null;
  pontos_fortes: string[] | null;
  pontos_atencao: string[] | null;
  fontes_cruzadas: Array<{
    tipo: string;
    titulo?: string;
    descricao?: string;
    relevancia: 'alta' | 'media' | 'baixa';
  }> | null;
  evaluated_at: string;
  is_stale: boolean;
}

interface Eixo {
  id: string;
  nome: string;
}

interface Municipio {
  id: string;
  nome: string;
  regiao: string | null;
}

interface ProposalDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string | null;
  eixos: Eixo[];
  municipios: Municipio[];
  onProposalUpdated?: () => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-500' },
  validada: { label: 'Validada', color: 'bg-blue-500' },
  consolidada: { label: 'Consolidada', color: 'bg-yellow-500' },
  aprovada: { label: 'Aprovada', color: 'bg-green-500' },
};

const questionarioLabels: Record<string, string> = {
  // Identificação
  nome_lider: 'Nome do Líder',
  cargo_lider: 'Cargo do Líder',
  area_atuacao: 'Área de Atuação',
  
  // Diagnóstico
  diagnostico_situacao: 'Diagnóstico da Situação',
  problemas_identificados: 'Problemas Identificados',
  publico_afetado: 'Público Afetado',
  dados_quantitativos: 'Dados Quantitativos',
  
  // Objetivos
  objetivo_geral: 'Objetivo Geral',
  objetivos_especificos: 'Objetivos Específicos',
  resultados_esperados: 'Resultados Esperados',
  
  // Implementação
  acoes_propostas: 'Ações Propostas',
  cronograma: 'Cronograma',
  recursos_necessarios: 'Recursos Necessários',
  parcerias: 'Parcerias',
  
  // Viabilidade
  viabilidade_tecnica: 'Viabilidade Técnica',
  viabilidade_financeira: 'Viabilidade Financeira',
  riscos: 'Riscos Identificados',
  
  // Outros
  observacoes: 'Observações',
  anexos_descricao: 'Descrição de Anexos',
};

export const ProposalDetailModal = ({
  open,
  onOpenChange,
  proposalId,
  eixos,
  municipios,
  onProposalUpdated,
}: ProposalDetailModalProps) => {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [editData, setEditData] = useState<Partial<Proposal>>({});

  useEffect(() => {
    if (open && proposalId) {
      fetchProposal();
      fetchEvaluation();
    }
  }, [open, proposalId]);

  const fetchProposal = async () => {
    if (!proposalId) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('propostas_tecnicas')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (error) {
      toast.error('Erro ao carregar proposta');
      console.error(error);
    } else {
      setProposal(data as Proposal);
      setEditData(data as Proposal);
    }
    setIsLoading(false);
  };

  const fetchEvaluation = async () => {
    if (!proposalId) return;
    
    const { data, error } = await supabase
      .from('proposal_evaluations')
      .select('*')
      .eq('proposta_id', proposalId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setEvaluation({
        ...data,
        scores: (data.scores || {}) as Evaluation['scores'],
        fontes_cruzadas: (data.fontes_cruzadas || []) as Evaluation['fontes_cruzadas'],
      });
    } else {
      setEvaluation(null);
    }
  };

  const handleSave = async () => {
    if (!proposalId || !editData) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('propostas_tecnicas')
      .update({
        titulo: editData.titulo,
        descricao: editData.descricao,
        status: editData.status,
        eixo_id: editData.eixo_id,
        municipio_id: editData.municipio_id,
        metas: editData.metas,
        indicadores: editData.indicadores,
        entrevistado: editData.entrevistado,
      })
      .eq('id', proposalId);

    if (error) {
      toast.error('Erro ao salvar proposta');
      console.error(error);
    } else {
      toast.success('Proposta atualizada com sucesso');
      setIsEditing(false);
      fetchProposal();
      onProposalUpdated?.();
    }
    setIsLoading(false);
  };

  const handleEvaluate = async () => {
    if (!proposalId) return;
    setIsEvaluating(true);

    try {
      const { data, error } = await supabase.functions.invoke('evaluate-proposal', {
        body: { proposalId },
      });

      if (error) throw error;

      toast.success('Avaliação gerada com sucesso');
      fetchEvaluation();
    } catch (error) {
      console.error('Erro ao avaliar:', error);
      toast.error('Erro ao gerar avaliação');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getEixoNome = (eixoId: string) => {
    return eixos.find(e => e.id === eixoId)?.nome || 'N/A';
  };

  const getMunicipioNome = (municipioId: string | null) => {
    if (!municipioId) return 'Estadual';
    return municipios.find(m => m.id === municipioId)?.nome || 'N/A';
  };

  const renderQuestionario = () => {
    if (!proposal?.questionario) {
      return (
        <p className="text-muted-foreground text-center py-8">
          Nenhum questionário preenchido para esta proposta.
        </p>
      );
    }

    const questionario = proposal.questionario as Record<string, string | string[]>;
    
    return (
      <div className="space-y-4">
        {Object.entries(questionario).map(([key, value]) => {
          if (!value || (Array.isArray(value) && value.length === 0)) return null;
          
          const label = questionarioLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          return (
            <Card key={key}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {Array.isArray(value) ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {value.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (!proposal) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-xl font-bold truncate flex-1">
              {proposal.titulo}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={statusLabels[proposal.status]?.color}>
                {statusLabels[proposal.status]?.label}
              </Badge>
              {evaluation && (
                <ScoreBadge 
                  score={evaluation.score_total} 
                  scores={evaluation.scores}
                  isStale={evaluation.is_stale}
                />
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="dados" className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="questionario" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Questionário
            </TabsTrigger>
            <TabsTrigger value="avaliacao" className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              Avaliação IA
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="dados" className="m-0 space-y-4">
              <div className="flex justify-end">
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isLoading}>
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  {isEditing ? (
                    <Input
                      value={editData.titulo || ''}
                      onChange={(e) => setEditData({ ...editData, titulo: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm p-2 bg-muted rounded">{proposal.titulo}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  {isEditing ? (
                    <Select
                      value={editData.status}
                      onValueChange={(value: any) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="validada">Validada</SelectItem>
                        <SelectItem value="consolidada">Consolidada</SelectItem>
                        <SelectItem value="aprovada">Aprovada</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={statusLabels[proposal.status]?.color}>
                      {statusLabels[proposal.status]?.label}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Eixo Temático</Label>
                  {isEditing ? (
                    <Select
                      value={editData.eixo_id}
                      onValueChange={(value) => setEditData({ ...editData, eixo_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eixos.map((eixo) => (
                          <SelectItem key={eixo.id} value={eixo.id}>
                            {eixo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm p-2 bg-muted rounded">{getEixoNome(proposal.eixo_id)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Município</Label>
                  {isEditing ? (
                    <Select
                      value={editData.municipio_id || 'estadual'}
                      onValueChange={(value) => setEditData({ ...editData, municipio_id: value === 'estadual' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estadual">Estadual</SelectItem>
                        {municipios.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm p-2 bg-muted rounded">{getMunicipioNome(proposal.municipio_id)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Entrevistado</Label>
                  {isEditing ? (
                    <Input
                      value={editData.entrevistado || ''}
                      onChange={(e) => setEditData({ ...editData, entrevistado: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm p-2 bg-muted rounded">{proposal.entrevistado || 'N/A'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <p className="text-sm p-2 bg-muted rounded">Etapa {proposal.etapa}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                {isEditing ? (
                  <Textarea
                    value={editData.descricao || ''}
                    onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted rounded whitespace-pre-wrap">{proposal.descricao}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metas</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.metas || ''}
                      onChange={(e) => setEditData({ ...editData, metas: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm p-2 bg-muted rounded whitespace-pre-wrap">{proposal.metas || 'N/A'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Indicadores</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.indicadores || ''}
                      onChange={(e) => setEditData({ ...editData, indicadores: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm p-2 bg-muted rounded whitespace-pre-wrap">{proposal.indicadores || 'N/A'}</p>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex gap-4">
                <span>Criado em: {new Date(proposal.created_at).toLocaleString('pt-BR')}</span>
                <span>Atualizado em: {new Date(proposal.updated_at).toLocaleString('pt-BR')}</span>
              </div>
            </TabsContent>

            <TabsContent value="questionario" className="m-0">
              {renderQuestionario()}
            </TabsContent>

            <TabsContent value="avaliacao" className="m-0">
              {evaluation ? (
                <EvaluationBreakdown
                  scoreTotal={evaluation.score_total}
                  scores={evaluation.scores}
                  justificativa={evaluation.justificativa || undefined}
                  pontosFortes={evaluation.pontos_fortes || undefined}
                  pontosAtencao={evaluation.pontos_atencao || undefined}
                  fontesCruzadas={evaluation.fontes_cruzadas || undefined}
                  isStale={evaluation.is_stale}
                  evaluatedAt={evaluation.evaluated_at}
                  onRefresh={handleEvaluate}
                  isLoading={isEvaluating}
                />
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma avaliação encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Gere uma avaliação de IA para analisar a relevância técnica desta proposta.
                  </p>
                  <Button onClick={handleEvaluate} disabled={isEvaluating}>
                    <Brain className="h-4 w-4 mr-2" />
                    {isEvaluating ? 'Avaliando...' : 'Gerar Avaliação'}
                  </Button>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
