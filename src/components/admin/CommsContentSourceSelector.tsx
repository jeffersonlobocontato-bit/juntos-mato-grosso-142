import React, { useEffect, useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Users, BarChart3, ClipboardList, CheckSquare, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  title: string;
  doc_category: string;
}

interface Pesquisa {
  id: string;
  titulo: string;
  instituto: string;
}

interface Proposta {
  id: string;
  titulo: string;
}

export interface CommsSourceSelection {
  documentIds: string[];
  includeSugestoes: boolean;
  pesquisaIds: string[];
  includePropostas: boolean;
  propostaIds: string[];
}

export const FORMATOS_DISPONIVEIS = [
  { id: 'pit', label: 'Pit de Falas', desc: 'Bullets curtos para entrevista' },
  { id: 'discurso', label: 'Discurso', desc: 'Texto completo para fala pública' },
  { id: 'release', label: 'Release', desc: 'Formato jornalístico para imprensa' },
  { id: 'nota', label: 'Nota para Imprensa', desc: 'Resposta curta e factual' },
] as const;

const categoryLabels: Record<string, string> = {
  'documento_tecnico': 'Documento Técnico',
  'plano_governo': 'Plano de Governo',
  'noticia': 'Notícia',
  'comprovacao': 'Comprovação',
  'investimento': 'Investimento',
  'promessa': 'Promessa',
  'legislacao': 'Legislação',
  'outro': 'Outro',
};

interface CommsContentSourceSelectorProps {
  selection: CommsSourceSelection;
  onSelectionChange: (selection: CommsSourceSelection) => void;
  formatosSelecionados: string[];
  onFormatosChange: (formatos: string[]) => void;
}

export const CommsContentSourceSelector: React.FC<CommsContentSourceSelectorProps> = ({
  selection,
  onSelectionChange,
  formatosSelecionados,
  onFormatosChange,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);

      const [docsResult, pesquisasResult, propostasResult] = await Promise.all([
        supabase
          .from('ai_documents')
          .select('id, title, doc_category')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('pesquisas_eleitorais')
          .select('id, titulo, instituto')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('propostas_tecnicas')
          .select('id, titulo')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (docsResult.data) setDocuments(docsResult.data);
      if (pesquisasResult.data) setPesquisas(pesquisasResult.data);
      if (propostasResult.data) setPropostas(propostasResult.data);

      setLoading(false);
    };

    fetchSources();
  }, []);

  const toggleDocument = (id: string, checked: boolean) => {
    const newIds = checked
      ? [...selection.documentIds, id]
      : selection.documentIds.filter(x => x !== id);
    onSelectionChange({ ...selection, documentIds: newIds });
  };

  const togglePesquisa = (id: string, checked: boolean) => {
    const newIds = checked
      ? [...selection.pesquisaIds, id]
      : selection.pesquisaIds.filter(x => x !== id);
    onSelectionChange({ ...selection, pesquisaIds: newIds });
  };

  const toggleProposta = (id: string, checked: boolean) => {
    const newIds = checked
      ? [...selection.propostaIds, id]
      : selection.propostaIds.filter(x => x !== id);
    onSelectionChange({ ...selection, propostaIds: newIds });
  };

  const toggleFormato = (formatoId: string, checked: boolean) => {
    onFormatosChange(
      checked
        ? [...formatosSelecionados, formatoId]
        : formatosSelecionados.filter(f => f !== formatoId)
    );
  };

  const selectAll = (key: 'documentIds' | 'pesquisaIds' | 'propostaIds', allIds: string[]) => {
    onSelectionChange({ ...selection, [key]: allIds });
  };

  const clearAll = (key: 'documentIds' | 'pesquisaIds' | 'propostaIds') => {
    onSelectionChange({ ...selection, [key]: [] });
  };

  const totalFontes =
    selection.documentIds.length +
    selection.pesquisaIds.length +
    selection.propostaIds.length +
    (selection.includeSugestoes ? 1 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando fontes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Formatos a gerar */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Formatos a gerar</h4>
        <div className="grid grid-cols-2 gap-2">
          {FORMATOS_DISPONIVEIS.map((f) => (
            <div
              key={f.id}
              className="flex items-start space-x-2 p-2 rounded-lg border bg-muted/30"
            >
              <Checkbox
                id={`formato-${f.id}`}
                checked={formatosSelecionados.includes(f.id)}
                onCheckedChange={(checked) => toggleFormato(f.id, checked as boolean)}
              />
              <Label htmlFor={`formato-${f.id}`} className="cursor-pointer">
                <span className="block text-sm font-medium">{f.label}</span>
                <span className="block text-xs text-muted-foreground">{f.desc}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <h4 className="text-sm font-semibold text-foreground">Selecione as fontes para a pesquisa</h4>
        <Badge variant="secondary" className="text-xs">
          {totalFontes} fonte{totalFontes !== 1 ? 's' : ''} selecionada{totalFontes !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Accordion type="multiple" defaultValue={["documents", "sugestoes", "pesquisas", "propostas"]} className="space-y-2">
        {/* Documentos */}
        <AccordionItem value="documents" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Documentos da Base IA</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {selection.documentIds.length}/{documents.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => selectAll('documentIds', documents.map(d => d.id))} className="h-7 text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                Todos
              </Button>
              <Button size="sm" variant="outline" onClick={() => clearAll('documentIds')} className="h-7 text-xs">
                <Square className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum documento disponível</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id={`cdoc-${doc.id}`}
                      checked={selection.documentIds.includes(doc.id)}
                      onCheckedChange={(checked) => toggleDocument(doc.id, checked as boolean)}
                    />
                    <Label htmlFor={`cdoc-${doc.id}`} className="flex items-center gap-2 cursor-pointer text-sm flex-1">
                      <span className="truncate max-w-[200px]">{doc.title}</span>
                      <Badge className="text-xs bg-blue-100 text-blue-800">
                        {categoryLabels[doc.doc_category] || doc.doc_category}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Sugestões Populares */}
        <AccordionItem value="sugestoes" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="font-medium">Sugestões Populares</span>
              {selection.includeSugestoes && (
                <Badge variant="default" className="ml-2 text-xs bg-green-600">Ativo</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex-1">
                <Label htmlFor="ccs-include-sugestoes" className="font-normal cursor-pointer">
                  Incluir demandas da população
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajuda a IA a conectar o conteúdo com expectativas reais do eleitorado
                </p>
              </div>
              <Switch
                id="ccs-include-sugestoes"
                checked={selection.includeSugestoes}
                onCheckedChange={(checked) => onSelectionChange({ ...selection, includeSugestoes: checked })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pesquisas Eleitorais */}
        <AccordionItem value="pesquisas" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Pesquisas Eleitorais</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {selection.pesquisaIds.length}/{pesquisas.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => selectAll('pesquisaIds', pesquisas.map(p => p.id))} className="h-7 text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                Todas
              </Button>
              <Button size="sm" variant="outline" onClick={() => clearAll('pesquisaIds')} className="h-7 text-xs">
                <Square className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>

            {pesquisas.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma pesquisa disponível</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pesquisas.map((pesq) => (
                  <div key={pesq.id} className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id={`cpesq-${pesq.id}`}
                      checked={selection.pesquisaIds.includes(pesq.id)}
                      onCheckedChange={(checked) => togglePesquisa(pesq.id, checked as boolean)}
                    />
                    <Label htmlFor={`cpesq-${pesq.id}`} className="flex items-center gap-2 cursor-pointer text-sm flex-1">
                      <span className="truncate max-w-[200px]">{pesq.titulo}</span>
                      <Badge variant="outline" className="text-xs">{pesq.instituto}</Badge>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Propostas Técnicas */}
        <AccordionItem value="propostas" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              <span className="font-medium">Propostas Técnicas da Campanha</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {selection.propostaIds.length}/{propostas.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 mb-3">
              <Label htmlFor="ccs-include-propostas" className="font-normal cursor-pointer text-sm">
                Incluir propostas técnicas como fonte
              </Label>
              <Switch
                id="ccs-include-propostas"
                checked={selection.includePropostas}
                onCheckedChange={(checked) => onSelectionChange({ ...selection, includePropostas: checked })}
              />
            </div>

            {selection.includePropostas && (
              <>
                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant="outline" onClick={() => selectAll('propostaIds', propostas.map(p => p.id))} className="h-7 text-xs">
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Todas
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => clearAll('propostaIds')} className="h-7 text-xs">
                    <Square className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                </div>
                {propostas.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhuma proposta disponível</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {propostas.map((prop) => (
                      <div key={prop.id} className="flex items-center space-x-3 py-1">
                        <Checkbox
                          id={`cprop-${prop.id}`}
                          checked={selection.propostaIds.includes(prop.id)}
                          onCheckedChange={(checked) => toggleProposta(prop.id, checked as boolean)}
                        />
                        <Label htmlFor={`cprop-${prop.id}`} className="cursor-pointer text-sm flex-1 truncate">
                          {prop.titulo}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        💡 A IA vai mapear os temas convergentes com o briefing e gerar os formatos selecionados, ancorados nas {totalFontes} fonte{totalFontes !== 1 ? 's' : ''} escolhida{totalFontes !== 1 ? 's' : ''}.
      </div>
    </div>
  );
};
