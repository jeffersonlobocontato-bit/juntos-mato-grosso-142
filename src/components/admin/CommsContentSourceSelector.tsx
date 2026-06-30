import React, { useEffect, useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Users, BarChart3, ClipboardList, Megaphone, CheckSquare, Square, Loader2, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Sugestao {
  id: string;
  descricao: string;
  eixo: string | null;
  municipio: string | null;
}

interface PropostaPolitica {
  id: string;
  titulo: string;
}

export interface CommsSourceSelection {
  documentIds: string[];
  sugestaoIds: string[];
  pesquisaIds: string[];
  propostaIds: string[];
  propostaPoliticaIds: string[];
  eixoFiltroId?: string | null;
  subtemaFiltroIds?: string[];
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
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [propostasPoliticas, setPropostasPoliticas] = useState<PropostaPolitica[]>([]);
  const [loading, setLoading] = useState(true);
  const [eixos, setEixos] = useState<Array<{ id: string; nome: string }>>([]);
  const [subtemas, setSubtemas] = useState<Array<{ id: string; nome: string; tema_id: string }>>([]);

  const eixoFiltroId = selection.eixoFiltroId ?? null;
  const subtemaFiltroIds = selection.subtemaFiltroIds ?? [];

  // Carrega eixos uma vez
  useEffect(() => {
    supabase.from('eixos_tematicos').select('id, nome').order('ordem').then(({ data }) => {
      if (data) setEixos(data);
    });
  }, []);

  // Carrega subtemas do eixo selecionado
  useEffect(() => {
    if (!eixoFiltroId) {
      setSubtemas([]);
      return;
    }
    (async () => {
      const { data: temasData } = await supabase
        .from('temas')
        .select('id')
        .eq('eixo_id', eixoFiltroId);
      const temaIds = (temasData || []).map((t) => t.id);
      if (temaIds.length === 0) { setSubtemas([]); return; }
      const { data: subData } = await supabase
        .from('subtemas')
        .select('id, nome, tema_id')
        .in('tema_id', temaIds)
        .order('ordem');
      setSubtemas(subData || []);
    })();
  }, [eixoFiltroId]);

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);

      // ---- DOCUMENTOS ----
      let docIdsByTema: Set<string> | null = null;
      if (eixoFiltroId && subtemaFiltroIds.length > 0) {
        // Subtemas têm tema_id; ai_document_temas referencia tema_id, então mapeamos subtema -> tema
        const temaIdsFromSubs = Array.from(
          new Set(subtemas.filter((s) => subtemaFiltroIds.includes(s.id)).map((s) => s.tema_id))
        );
        if (temaIdsFromSubs.length > 0) {
          const { data: links } = await supabase
            .from('ai_document_temas')
            .select('document_id')
            .in('tema_id', temaIdsFromSubs);
          docIdsByTema = new Set((links || []).map((l: any) => l.document_id));
        } else {
          docIdsByTema = new Set();
        }
      }

      let docsQuery = supabase
        .from('ai_documents')
        .select('id, title, doc_category')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (eixoFiltroId && (!docIdsByTema || docIdsByTema.size === 0)) {
        // só eixo: filtrar por eixo_id direto OU pelos documentos vinculados a temas desse eixo
        const { data: temasOfEixo } = await supabase
          .from('temas').select('id').eq('eixo_id', eixoFiltroId);
        const temaIds = (temasOfEixo || []).map((t) => t.id);
        let docIdsFromTemas: string[] = [];
        if (temaIds.length > 0) {
          const { data: links } = await supabase
            .from('ai_document_temas').select('document_id').in('tema_id', temaIds);
          docIdsFromTemas = (links || []).map((l: any) => l.document_id);
        }
        // OR: eixo direto OU id na lista vinda dos temas
        const orParts = [`eixo_id.eq.${eixoFiltroId}`];
        if (docIdsFromTemas.length > 0) {
          orParts.push(`id.in.(${docIdsFromTemas.join(',')})`);
        }
        docsQuery = docsQuery.or(orParts.join(','));
      }

      // ---- PROPOSTAS TÉCNICAS ----
      let propQuery = supabase
        .from('propostas_tecnicas')
        .select('id, titulo')
        .order('created_at', { ascending: false })
        .limit(100);
      if (eixoFiltroId) propQuery = propQuery.eq('eixo_id', eixoFiltroId);
      if (subtemaFiltroIds.length > 0) propQuery = propQuery.in('subtema_id', subtemaFiltroIds);

      // ---- PROPOSTAS POLÍTICAS ----
      let polQuery = supabase
        .from('propostas_politicas')
        .select('id, titulo')
        .order('created_at', { ascending: false })
        .limit(100);
      if (eixoFiltroId) polQuery = polQuery.eq('eixo_id', eixoFiltroId);

      // ---- SUGESTÕES POPULARES ----
      let sugQuery = supabase
        .from('sugestoes_populares')
        .select('id, descricao, eixo, municipio')
        .order('created_at', { ascending: false })
        .limit(200);
      if (eixoFiltroId) {
        // nome do eixo p/ match textual (coluna 'eixo' é texto), fallback p/ tema_ids/tema_id
        const eixoNome = eixos.find((e) => e.id === eixoFiltroId)?.nome;
        if (eixoNome) sugQuery = sugQuery.ilike('eixo', `%${eixoNome}%`);
      }

      // ---- PESQUISAS (texto livre — sem filtro por eixo) ----
      const pesquisasPromise = supabase
        .from('pesquisas_eleitorais')
        .select('id, titulo, instituto')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const [docsResult, pesquisasResult, propostasResult, sugestoesResult, propostasPolResult] =
        await Promise.all([docsQuery, pesquisasPromise, propQuery, sugQuery, polQuery]);

      let docs = docsResult.data || [];
      if (docIdsByTema) {
        docs = docs.filter((d: any) => docIdsByTema!.has(d.id));
      }

      setDocuments(docs as Document[]);
      setPesquisas(pesquisasResult.data || []);
      setPropostas(propostasResult.data || []);
      setSugestoes((sugestoesResult.data || []) as Sugestao[]);
      setPropostasPoliticas(propostasPolResult.data || []);

      setLoading(false);
    };

    fetchSources();
  }, [eixoFiltroId, JSON.stringify(subtemaFiltroIds), eixos.length, subtemas.length]);

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

  const toggleSugestao = (id: string, checked: boolean) => {
    const newIds = checked
      ? [...selection.sugestaoIds, id]
      : selection.sugestaoIds.filter(x => x !== id);
    onSelectionChange({ ...selection, sugestaoIds: newIds });
  };

  const togglePropostaPolitica = (id: string, checked: boolean) => {
    const newIds = checked
      ? [...selection.propostaPoliticaIds, id]
      : selection.propostaPoliticaIds.filter(x => x !== id);
    onSelectionChange({ ...selection, propostaPoliticaIds: newIds });
  };

  const toggleFormato = (formatoId: string, checked: boolean) => {
    onFormatosChange(
      checked
        ? [...formatosSelecionados, formatoId]
        : formatosSelecionados.filter(f => f !== formatoId)
    );
  };

  type ListKey = 'documentIds' | 'pesquisaIds' | 'propostaIds' | 'sugestaoIds' | 'propostaPoliticaIds';
  const selectAll = (key: ListKey, allIds: string[]) => {
    onSelectionChange({ ...selection, [key]: allIds });
  };

  const clearAll = (key: ListKey) => {
    onSelectionChange({ ...selection, [key]: [] });
  };

  const totalFontes =
    selection.documentIds.length +
    selection.pesquisaIds.length +
    selection.propostaIds.length +
    selection.sugestaoIds.length +
    selection.propostaPoliticaIds.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando fontes...</span>
      </div>
    );
  }

  const setEixo = (id: string | null) => {
    onSelectionChange({ ...selection, eixoFiltroId: id, subtemaFiltroIds: [] });
  };
  const toggleSubtemaFiltro = (id: string, checked: boolean) => {
    const next = checked
      ? [...subtemaFiltroIds, id]
      : subtemaFiltroIds.filter((x) => x !== id);
    onSelectionChange({ ...selection, subtemaFiltroIds: next });
  };
  const limparRecorte = () => {
    onSelectionChange({ ...selection, eixoFiltroId: null, subtemaFiltroIds: [] });
  };

  return (
    <div className="space-y-4">
      {/* Recorte temático (filtros cruzados) */}
      <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Recorte temático (opcional)
          </h4>
          {(eixoFiltroId || subtemaFiltroIds.length > 0) && (
            <Button size="sm" variant="ghost" onClick={limparRecorte} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Cruza as fontes com um eixo e subtemas. Ex: documento Pelti + Infraestrutura + subtemas específicos.
        </p>
        <Select
          value={eixoFiltroId || 'none'}
          onValueChange={(v) => setEixo(v === 'none' ? null : v)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecione um eixo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todos os eixos (sem recorte)</SelectItem>
            {eixos.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {eixoFiltroId && subtemas.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto pt-1">
            <p className="text-xs font-medium text-muted-foreground">Subtemas:</p>
            {subtemas.map((s) => (
              <div key={s.id} className="flex items-center space-x-2 py-0.5">
                <Checkbox
                  id={`sub-${s.id}`}
                  checked={subtemaFiltroIds.includes(s.id)}
                  onCheckedChange={(c) => toggleSubtemaFiltro(s.id, c as boolean)}
                />
                <Label htmlFor={`sub-${s.id}`} className="text-xs cursor-pointer">{s.nome}</Label>
              </div>
            ))}
          </div>
        )}
      </div>

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

      <Accordion type="multiple" defaultValue={["documents", "sugestoes", "pesquisas", "propostas", "propostas-politicas"]} className="space-y-2">
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
              <div className="space-y-2">
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
              <Badge variant="outline" className="ml-2 text-xs">
                {selection.sugestaoIds.length}/{sugestoes.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => selectAll('sugestaoIds', sugestoes.map(s => s.id))} className="h-7 text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                Todas
              </Button>
              <Button size="sm" variant="outline" onClick={() => clearAll('sugestaoIds')} className="h-7 text-xs">
                <Square className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
            {sugestoes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma sugestão disponível</p>
            ) : (
              <div className="space-y-2">
                {sugestoes.map((s) => (
                  <div key={s.id} className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id={`csug-${s.id}`}
                      checked={selection.sugestaoIds.includes(s.id)}
                      onCheckedChange={(checked) => toggleSugestao(s.id, checked as boolean)}
                    />
                    <Label htmlFor={`csug-${s.id}`} className="cursor-pointer text-sm flex-1">
                      <span className="line-clamp-2">{s.descricao}</span>
                      {(s.eixo || s.municipio) && (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {[s.eixo, s.municipio].filter(Boolean).join(' • ')}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
          </AccordionContent>
        </AccordionItem>

        {/* Propostas Políticas */}
        <AccordionItem value="propostas-politicas" className="border rounded-lg px-3">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-rose-600" />
              <span className="font-medium">Propostas Políticas</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {selection.propostaPoliticaIds.length}/{propostasPoliticas.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => selectAll('propostaPoliticaIds', propostasPoliticas.map(p => p.id))} className="h-7 text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                Todas
              </Button>
              <Button size="sm" variant="outline" onClick={() => clearAll('propostaPoliticaIds')} className="h-7 text-xs">
                <Square className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
            {propostasPoliticas.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma proposta política disponível</p>
            ) : (
              <div className="space-y-2">
                {propostasPoliticas.map((prop) => (
                  <div key={prop.id} className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id={`cpol-${prop.id}`}
                      checked={selection.propostaPoliticaIds.includes(prop.id)}
                      onCheckedChange={(checked) => togglePropostaPolitica(prop.id, checked as boolean)}
                    />
                    <Label htmlFor={`cpol-${prop.id}`} className="cursor-pointer text-sm flex-1 truncate">
                      {prop.titulo}
                    </Label>
                  </div>
                ))}
              </div>
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
