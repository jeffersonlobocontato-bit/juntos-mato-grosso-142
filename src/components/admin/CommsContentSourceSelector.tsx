import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FileText, Users, BarChart3, ClipboardList, Landmark, Megaphone,
  CheckSquare, Square, Loader2, ChevronDown, MapPin,
} from "lucide-react";
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
  municipio_id?: string | null;
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

interface Municipio {
  id: string;
  nome: string;
  regiao: string | null;
}

export interface CommsSourceSelection {
  documentIds: string[];
  sugestaoIds: string[];
  pesquisaIds: string[];
  propostaIds: string[]; // propostas_tecnicas com tipo_proposta = 'tecnica'
  propostaInstitucionalIds: string[]; // propostas_tecnicas com tipo_proposta = 'institucional'
  propostaPoliticaIds: string[];
  eixoFiltroId?: string | null;
  subtemaFiltroIds?: string[];
}

export const FORMATOS_DISPONIVEIS = [
  { id: 'pit', label: 'Pit de Falas', desc: 'Bullets curtos para entrevista' },
  { id: 'discurso', label: 'Discurso', desc: 'Texto completo para fala pública' },
  { id: 'release', label: 'Release', desc: 'Formato publieditorial (molde Gazeta do Povo)' },
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

type GeoScope = 'estado' | 'regiao' | 'cidade';

interface CommsContentSourceSelectorProps {
  selection: CommsSourceSelection;
  onSelectionChange: (selection: CommsSourceSelection) => void;
  formatosSelecionados: string[];
  onFormatosChange: (formatos: string[]) => void;
}

// ---- Card genérico expansível, estilo "sugestões abaixo do chat" ----
const SourceCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  selectedCount: number;
  totalCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ icon, title, selectedCount, totalCount, expanded, onToggle, children }) => (
  <Collapsible open={expanded} onOpenChange={onToggle}>
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3.5 py-3 hover:bg-muted/40 transition-colors text-left"
        >
          {icon}
          <span className="font-medium text-sm flex-1 truncate">{title}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {selectedCount}/{totalCount}
          </Badge>
          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3.5 pb-3.5 pt-1 border-t bg-muted/10">
          {children}
        </div>
      </CollapsibleContent>
    </div>
  </Collapsible>
);

// ---- Seletor de recorte geográfico (Paraná todo / por região / por cidade) ----
const GeoScopePicker: React.FC<{
  scope: GeoScope;
  onScopeChange: (s: GeoScope) => void;
  regioes: string[];
  municipios: Municipio[];
  valor: string | null;
  onValorChange: (v: string | null) => void;
}> = ({ scope, onScopeChange, regioes, municipios, valor, onValorChange }) => (
  <div className="flex flex-col sm:flex-row gap-2 mb-3">
    <Select
      value={scope}
      onValueChange={(v) => { onScopeChange(v as GeoScope); onValorChange(null); }}
    >
      <SelectTrigger className="h-8 text-xs sm:w-44">
        <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="estado">Paraná todo</SelectItem>
        <SelectItem value="regiao">Por região</SelectItem>
        <SelectItem value="cidade">Por cidade</SelectItem>
      </SelectContent>
    </Select>

    {scope === 'regiao' && (
      <Select value={valor || undefined} onValueChange={onValorChange}>
        <SelectTrigger className="h-8 text-xs sm:w-52">
          <SelectValue placeholder="Selecione a região" />
        </SelectTrigger>
        <SelectContent>
          {regioes.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}

    {scope === 'cidade' && (
      <Select value={valor || undefined} onValueChange={onValorChange}>
        <SelectTrigger className="h-8 text-xs sm:w-52">
          <SelectValue placeholder="Selecione o município" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {municipios.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </div>
);

const EixoPicker: React.FC<{
  eixos: Array<{ id: string; nome: string }>;
  value: string | null;
  onChange: (id: string | null) => void;
}> = ({ eixos, value, onChange }) => (
  <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
    <SelectTrigger className="h-8 text-xs sm:w-56 mb-3">
      <SelectValue placeholder="Selecione um eixo" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Todos os eixos</SelectItem>
      {eixos.map((e) => (
        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const CommsContentSourceSelector: React.FC<CommsContentSourceSelectorProps> = ({
  selection,
  onSelectionChange,
  formatosSelecionados,
  onFormatosChange,
}) => {
  const [loading, setLoading] = useState(true);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [propostasTecnicas, setPropostasTecnicas] = useState<Proposta[]>([]);
  const [propostasInstitucionais, setPropostasInstitucionais] = useState<Proposta[]>([]);
  const [propostasPoliticas, setPropostasPoliticas] = useState<PropostaPolitica[]>([]);

  const [eixos, setEixos] = useState<Array<{ id: string; nome: string }>>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  // Recorte por card: cada fonte com eixo tem seu próprio filtro independente
  const [tecEixo, setTecEixo] = useState<string | null>(null);
  const [tecGeoScope, setTecGeoScope] = useState<GeoScope>('estado');
  const [tecGeoValor, setTecGeoValor] = useState<string | null>(null);

  const [instEixo, setInstEixo] = useState<string | null>(null);
  const [instGeoScope, setInstGeoScope] = useState<GeoScope>('estado');
  const [instGeoValor, setInstGeoValor] = useState<string | null>(null);

  const [polEixo, setPolEixo] = useState<string | null>(null);

  // Estado de expansão dos cards
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    documentos: false,
    sugestoes: false,
    pesquisas: false,
    tecnicas: false,
    institucionais: false,
    politicas: false,
  });
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // ---- Carga inicial: eixos + municípios ----
  useEffect(() => {
    supabase.from('eixos_tematicos').select('id, nome').order('ordem').then(({ data }) => {
      if (data) setEixos(data);
    });
    supabase.from('municipios').select('id, nome, regiao').order('nome').then(({ data }) => {
      if (data) setMunicipios(data as Municipio[]);
    });
  }, []);

  const regioes = useMemo(
    () => Array.from(new Set(municipios.map((m) => m.regiao).filter(Boolean) as string[])).sort(),
    [municipios]
  );

  const filtrarPorGeo = (rows: Proposta[], scope: GeoScope, valor: string | null): Proposta[] => {
    if (scope === 'estado' || !valor) return rows;
    if (scope === 'cidade') return rows.filter((r) => r.municipio_id === valor);
    if (scope === 'regiao') {
      const idsNaRegiao = new Set(municipios.filter((m) => m.regiao === valor).map((m) => m.id));
      return rows.filter((r) => r.municipio_id && idsNaRegiao.has(r.municipio_id));
    }
    return rows;
  };

  // ---- Documentos + Sugestões + Pesquisas (sem geo) ----
  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true);
      const [docsRes, sugRes, pesqRes] = await Promise.all([
        supabase.from('ai_documents').select('id, title, doc_category')
          .eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('sugestoes_populares').select('id, descricao, eixo, municipio')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('pesquisas_eleitorais').select('id, titulo, instituto')
          .eq('is_active', true).order('created_at', { ascending: false }),
      ]);
      setDocuments((docsRes.data || []) as Document[]);
      setSugestoes((sugRes.data || []) as Sugestao[]);
      setPesquisas((pesqRes.data || []) as Pesquisa[]);
      setLoading(false);
    };
    fetchBase();
  }, []);

  // ---- Propostas Técnicas (tipo_proposta = 'tecnica') ----
  useEffect(() => {
    (async () => {
      let q = supabase.from('propostas_tecnicas').select('id, titulo, municipio_id')
        .eq('tipo_proposta', 'tecnica').order('created_at', { ascending: false }).limit(300);
      if (tecEixo) q = q.eq('eixo_id', tecEixo);
      const { data } = await q;
      setPropostasTecnicas(filtrarPorGeo((data || []) as Proposta[], tecGeoScope, tecGeoValor));
    })();
  }, [tecEixo, tecGeoScope, tecGeoValor, municipios.length]);

  // ---- Propostas Institucionais (tipo_proposta = 'institucional') ----
  useEffect(() => {
    (async () => {
      let q = supabase.from('propostas_tecnicas').select('id, titulo, municipio_id')
        .eq('tipo_proposta', 'institucional').order('created_at', { ascending: false }).limit(300);
      if (instEixo) q = q.eq('eixo_id', instEixo);
      const { data } = await q;
      setPropostasInstitucionais(filtrarPorGeo((data || []) as Proposta[], instGeoScope, instGeoValor));
    })();
  }, [instEixo, instGeoScope, instGeoValor, municipios.length]);

  // ---- Propostas Políticas (sem geo próprio — herda o eixo selecionado) ----
  useEffect(() => {
    (async () => {
      let q = supabase.from('propostas_politicas').select('id, titulo')
        .order('created_at', { ascending: false }).limit(300);
      if (polEixo) q = q.eq('eixo_id', polEixo);
      const { data } = await q;
      setPropostasPoliticas((data || []) as PropostaPolitica[]);
    })();
  }, [polEixo]);

  // ---- Toggles de seleção ----
  const toggleInArray = (key: keyof CommsSourceSelection, id: string, checked: boolean) => {
    const current = (selection[key] as string[]) || [];
    const next = checked ? [...current, id] : current.filter((x) => x !== id);
    onSelectionChange({ ...selection, [key]: next });
  };

  const selectAll = (key: keyof CommsSourceSelection, allIds: string[]) => {
    onSelectionChange({ ...selection, [key]: allIds });
  };
  const clearAll = (key: keyof CommsSourceSelection) => {
    onSelectionChange({ ...selection, [key]: [] });
  };

  const toggleFormato = (formatoId: string, checked: boolean) => {
    onFormatosChange(
      checked ? [...formatosSelecionados, formatoId] : formatosSelecionados.filter((f) => f !== formatoId)
    );
  };

  const totalFontes =
    selection.documentIds.length +
    selection.pesquisaIds.length +
    selection.propostaIds.length +
    selection.propostaInstitucionalIds.length +
    selection.sugestaoIds.length +
    selection.propostaPoliticaIds.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground text-sm">Carregando fontes...</span>
      </div>
    );
  }

  const renderCheckList = <T extends { id: string }>(
    items: T[],
    selectedIds: string[],
    key: keyof CommsSourceSelection,
    labelRenderer: (item: T) => React.ReactNode,
    emptyLabel: string,
  ) => (
    <>
      <div className="flex gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={() => selectAll(key, items.map((i) => i.id))} className="h-7 text-xs">
          <CheckSquare className="h-3 w-3 mr-1" /> Todos
        </Button>
        <Button size="sm" variant="outline" onClick={() => clearAll(key)} className="h-7 text-xs">
          <Square className="h-3 w-3 mr-1" /> Limpar
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-3 py-1">
              <Checkbox
                id={`chk-${key}-${item.id}`}
                checked={selectedIds.includes(item.id)}
                onCheckedChange={(checked) => toggleInArray(key, item.id, checked as boolean)}
              />
              <Label htmlFor={`chk-${key}-${item.id}`} className="cursor-pointer text-sm flex-1">
                {labelRenderer(item)}
              </Label>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Formatos a gerar */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Formatos a gerar</h4>
        <div className="grid grid-cols-2 gap-2">
          {FORMATOS_DISPONIVEIS.map((f) => (
            <div key={f.id} className="flex items-start space-x-2 p-2 rounded-lg border bg-muted/30">
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

      <div className="flex items-center justify-between pt-1">
        <h4 className="text-sm font-semibold text-foreground">Fontes para fundamentar o conteúdo</h4>
        <Badge variant="secondary" className="text-xs">
          {totalFontes} selecionada{totalFontes !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Grade de cards — um por tipo de fonte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Documentos Técnicos */}
        <div className="sm:col-span-2">
          <SourceCard
            icon={<FileText className="h-4 w-4 text-blue-600" />}
            title="Documentos Técnicos"
            selectedCount={selection.documentIds.length}
            totalCount={documents.length}
            expanded={expanded.documentos}
            onToggle={() => toggleExpanded('documentos')}
          >
            {renderCheckList(
              documents, selection.documentIds, 'documentIds',
              (doc) => (
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[220px]">{doc.title}</span>
                  <Badge className="text-xs bg-blue-100 text-blue-800">
                    {categoryLabels[doc.doc_category] || doc.doc_category}
                  </Badge>
                </span>
              ),
              "Nenhum documento disponível",
            )}
          </SourceCard>
        </div>

        {/* Sugestões Populares */}
        <SourceCard
          icon={<Users className="h-4 w-4 text-green-600" />}
          title="Sugestões Populares"
          selectedCount={selection.sugestaoIds.length}
          totalCount={sugestoes.length}
          expanded={expanded.sugestoes}
          onToggle={() => toggleExpanded('sugestoes')}
        >
          {renderCheckList(
            sugestoes, selection.sugestaoIds, 'sugestaoIds',
            (s) => (
              <span>
                <span className="line-clamp-2 block">{s.descricao}</span>
                {(s.eixo || s.municipio) && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {[s.eixo, s.municipio].filter(Boolean).join(' • ')}
                  </span>
                )}
              </span>
            ),
            "Nenhuma sugestão disponível",
          )}
        </SourceCard>

        {/* Pesquisas Eleitorais */}
        <SourceCard
          icon={<BarChart3 className="h-4 w-4 text-purple-600" />}
          title="Pesquisas Eleitorais"
          selectedCount={selection.pesquisaIds.length}
          totalCount={pesquisas.length}
          expanded={expanded.pesquisas}
          onToggle={() => toggleExpanded('pesquisas')}
        >
          {renderCheckList(
            pesquisas, selection.pesquisaIds, 'pesquisaIds',
            (p) => (
              <span className="flex items-center gap-2">
                <span className="truncate max-w-[180px]">{p.titulo}</span>
                <Badge variant="outline" className="text-xs">{p.instituto}</Badge>
              </span>
            ),
            "Nenhuma pesquisa disponível",
          )}
        </SourceCard>

        {/* Propostas Técnicas */}
        <SourceCard
          icon={<ClipboardList className="h-4 w-4 text-amber-600" />}
          title="Propostas Técnicas"
          selectedCount={selection.propostaIds.length}
          totalCount={propostasTecnicas.length}
          expanded={expanded.tecnicas}
          onToggle={() => toggleExpanded('tecnicas')}
        >
          <EixoPicker eixos={eixos} value={tecEixo} onChange={setTecEixo} />
          <GeoScopePicker
            scope={tecGeoScope} onScopeChange={setTecGeoScope}
            regioes={regioes} municipios={municipios}
            valor={tecGeoValor} onValorChange={setTecGeoValor}
          />
          {renderCheckList(
            propostasTecnicas, selection.propostaIds, 'propostaIds',
            (p) => <span className="truncate block">{p.titulo}</span>,
            "Nenhuma proposta técnica disponível para esse recorte",
          )}
        </SourceCard>

        {/* Propostas Institucionais */}
        <SourceCard
          icon={<Landmark className="h-4 w-4 text-cyan-700" />}
          title="Propostas Institucionais"
          selectedCount={selection.propostaInstitucionalIds.length}
          totalCount={propostasInstitucionais.length}
          expanded={expanded.institucionais}
          onToggle={() => toggleExpanded('institucionais')}
        >
          <EixoPicker eixos={eixos} value={instEixo} onChange={setInstEixo} />
          <GeoScopePicker
            scope={instGeoScope} onScopeChange={setInstGeoScope}
            regioes={regioes} municipios={municipios}
            valor={instGeoValor} onValorChange={setInstGeoValor}
          />
          {renderCheckList(
            propostasInstitucionais, selection.propostaInstitucionalIds, 'propostaInstitucionalIds',
            (p) => <span className="truncate block">{p.titulo}</span>,
            "Nenhuma proposta institucional disponível para esse recorte",
          )}
        </SourceCard>

        {/* Propostas Políticas */}
        <div className="sm:col-span-2">
          <SourceCard
            icon={<Megaphone className="h-4 w-4 text-rose-600" />}
            title="Propostas Políticas"
            selectedCount={selection.propostaPoliticaIds.length}
            totalCount={propostasPoliticas.length}
            expanded={expanded.politicas}
            onToggle={() => toggleExpanded('politicas')}
          >
            <EixoPicker eixos={eixos} value={polEixo} onChange={setPolEixo} />
            <p className="text-xs text-muted-foreground mb-3">
              Esta fonte não tem recorte geográfico próprio — o recorte segue o eixo temático selecionado acima.
            </p>
            {renderCheckList(
              propostasPoliticas, selection.propostaPoliticaIds, 'propostaPoliticaIds',
              (p) => <span className="truncate block">{p.titulo}</span>,
              "Nenhuma proposta política disponível para esse eixo",
            )}
          </SourceCard>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        💡 A IA vai mapear os temas convergentes com o briefing e gerar os formatos selecionados, ancorados nas {totalFontes} fonte{totalFontes !== 1 ? 's' : ''} escolhida{totalFontes !== 1 ? 's' : ''}.
      </div>
    </div>
  );
};
