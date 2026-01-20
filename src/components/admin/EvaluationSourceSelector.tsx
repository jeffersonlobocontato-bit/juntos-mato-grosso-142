import React, { useEffect, useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Users, BarChart3, CheckSquare, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  title: string;
  doc_category: string;
  temporal_status: string | null;
}

interface Pesquisa {
  id: string;
  titulo: string;
  instituto: string;
  abrangencia: string | null;
}

export interface SourceSelection {
  documentIds: string[];
  includeSugestoes: boolean;
  pesquisaIds: string[];
}

interface EvaluationSourceSelectorProps {
  eixoId?: string;
  selection: SourceSelection;
  onSelectionChange: (selection: SourceSelection) => void;
}

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

const categoryColors: Record<string, string> = {
  'documento_tecnico': 'bg-blue-100 text-blue-800',
  'plano_governo': 'bg-purple-100 text-purple-800',
  'noticia': 'bg-orange-100 text-orange-800',
  'comprovacao': 'bg-green-100 text-green-800',
  'investimento': 'bg-yellow-100 text-yellow-800',
  'promessa': 'bg-pink-100 text-pink-800',
  'legislacao': 'bg-gray-100 text-gray-800',
  'outro': 'bg-slate-100 text-slate-800',
};

export const EvaluationSourceSelector: React.FC<EvaluationSourceSelectorProps> = ({
  eixoId,
  selection,
  onSelectionChange,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);
      
      const [docsResult, pesquisasResult] = await Promise.all([
        supabase
          .from('ai_documents')
          .select('id, title, doc_category, temporal_status')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('pesquisas_eleitorais')
          .select('id, titulo, instituto, abrangencia')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      if (docsResult.data) setDocuments(docsResult.data);
      if (pesquisasResult.data) setPesquisas(pesquisasResult.data);
      
      setLoading(false);
    };

    fetchSources();
  }, []);

  const handleDocumentToggle = (docId: string, checked: boolean) => {
    const newIds = checked
      ? [...selection.documentIds, docId]
      : selection.documentIds.filter(id => id !== docId);
    onSelectionChange({ ...selection, documentIds: newIds });
  };

  const handlePesquisaToggle = (pesquisaId: string, checked: boolean) => {
    const newIds = checked
      ? [...selection.pesquisaIds, pesquisaId]
      : selection.pesquisaIds.filter(id => id !== pesquisaId);
    onSelectionChange({ ...selection, pesquisaIds: newIds });
  };

  const handleSugestoesToggle = (checked: boolean) => {
    onSelectionChange({ ...selection, includeSugestoes: checked });
  };

  const selectAllDocuments = () => {
    onSelectionChange({ ...selection, documentIds: documents.map(d => d.id) });
  };

  const clearAllDocuments = () => {
    onSelectionChange({ ...selection, documentIds: [] });
  };

  const selectAllPesquisas = () => {
    onSelectionChange({ ...selection, pesquisaIds: pesquisas.map(p => p.id) });
  };

  const clearAllPesquisas = () => {
    onSelectionChange({ ...selection, pesquisaIds: [] });
  };

  const totalSelected = 
    selection.documentIds.length + 
    selection.pesquisaIds.length + 
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
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Selecione as fontes para cruzamento</h4>
        <Badge variant="secondary" className="text-xs">
          {totalSelected} fonte{totalSelected !== 1 ? 's' : ''} selecionada{totalSelected !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Accordion type="multiple" defaultValue={["documents", "sugestoes", "pesquisas"]} className="space-y-2">
        {/* Documentos da Base IA */}
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
              <Button size="sm" variant="outline" onClick={selectAllDocuments} className="h-7 text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                Todos
              </Button>
              <Button size="sm" variant="outline" onClick={clearAllDocuments} className="h-7 text-xs">
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
                      id={`doc-${doc.id}`}
                      checked={selection.documentIds.includes(doc.id)}
                      onCheckedChange={(checked) => handleDocumentToggle(doc.id, checked as boolean)}
                    />
                    <Label htmlFor={`doc-${doc.id}`} className="flex items-center gap-2 cursor-pointer text-sm flex-1">
                      <span className="truncate max-w-[200px]">{doc.title}</span>
                      <Badge className={`text-xs ${categoryColors[doc.doc_category] || 'bg-gray-100 text-gray-800'}`}>
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
                <Badge variant="default" className="ml-2 text-xs bg-green-600">
                  Ativo
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex-1">
                <Label htmlFor="include-sugestoes" className="font-normal cursor-pointer">
                  Incluir sugestões do mesmo eixo temático
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Cruza a proposta com demandas da população relacionadas ao eixo
                </p>
              </div>
              <Switch
                id="include-sugestoes"
                checked={selection.includeSugestoes}
                onCheckedChange={handleSugestoesToggle}
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
              <Button size="sm" variant="outline" onClick={selectAllPesquisas} className="h-7 text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                Todas
              </Button>
              <Button size="sm" variant="outline" onClick={clearAllPesquisas} className="h-7 text-xs">
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
                      id={`pesq-${pesq.id}`}
                      checked={selection.pesquisaIds.includes(pesq.id)}
                      onCheckedChange={(checked) => handlePesquisaToggle(pesq.id, checked as boolean)}
                    />
                    <Label htmlFor={`pesq-${pesq.id}`} className="flex items-center gap-2 cursor-pointer text-sm flex-1">
                      <span className="truncate max-w-[200px]">{pesq.titulo}</span>
                      <Badge variant="outline" className="text-xs">
                        {pesq.instituto}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        💡 A IA cruzará a proposta com as {totalSelected} fonte{totalSelected !== 1 ? 's' : ''} selecionada{totalSelected !== 1 ? 's' : ''} para gerar o score e análise.
      </div>
    </div>
  );
};
