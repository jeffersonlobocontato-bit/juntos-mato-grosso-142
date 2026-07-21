import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DocumentUploadModal from './DocumentUploadModal';
import { DocumentAgentLinker } from './DocumentAgentLinker';
import { TemasMultiSelect } from './TemasMultiSelect';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { saveAs } from 'file-saver';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { 
  BookOpen, Plus, Search, FileText, Eye, EyeOff, Trash2,
  ExternalLink, Filter, Loader2, CheckCircle, Clock, AlertCircle, Circle,
  Globe, Bot, Tag, AlertTriangle, Pencil, Download, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIDocument {
  id: string;
  title: string;
  description: string | null;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  doc_category: string;
  temporal_status: string | null;
  eixo_id: string | null;
  municipio_id: string | null;
  regiao: string | null;
  source_url: string | null;
  is_active: boolean;
  scope: string;
  created_at: string;
  eixos_tematicos?: { nome: string } | null;
  municipios?: { nome: string } | null;
  temas?: { id: string; nome: string }[];
}

interface DocumentLibraryProps {
  eixos: { id: string; nome: string }[];
  municipios: { id: string; nome: string; regiao: string | null }[];
  regioes: string[];
  className?: string;
}

const DOC_CATEGORY_LABELS: Record<string, string> = {
  plano_governo: 'Plano de Governo',
  documento_tecnico: 'Documento Técnico',
  noticia: 'Notícia',
  comprovacao: 'Comprovação',
  investimento: 'Investimento',
  promessa: 'Promessa',
  legislacao: 'Legislação',
  outro: 'Outro',
};

const TEMPORAL_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  realizado: { label: 'Realizado', icon: CheckCircle, color: 'text-green-500' },
  em_andamento: { label: 'Em Andamento', icon: Clock, color: 'text-yellow-500' },
  prometido: { label: 'Prometido', icon: AlertCircle, color: 'text-blue-500' },
  nao_iniciado: { label: 'Não Iniciado', icon: Circle, color: 'text-gray-500' },
};

export function DocumentLibrary({ eixos, municipios, regioes, className }: DocumentLibraryProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('ai_documents')
        .select(`*, eixos_tematicos(nome), municipios(nome), ai_document_temas(temas(id, nome))`)
        .order('created_at', { ascending: false });

      if (!showInactive) query = query.eq('is_active', true);
      if (categoryFilter) query = query.eq('doc_category', categoryFilter);
      if (statusFilter) query = query.eq('temporal_status', statusFilter);
      if (scopeFilter) query = query.eq('scope', scopeFilter);

      const { data, error } = await query;
      if (error) throw error;
      const normalized = ((data as any[]) || []).map((d: any) => ({
        ...d,
        temas: (d.ai_document_temas || [])
          .map((link: any) => link.temas)
          .filter(Boolean),
      }));
      setDocuments(normalized);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: "Erro ao carregar documentos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, statusFilter, scopeFilter, showInactive]);

  const toggleDocumentActive = async (docId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from('ai_documents').update({ is_active: !currentActive }).eq('id', docId);
      if (error) throw error;
      setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, is_active: !currentActive } : doc));
      toast({ title: currentActive ? "Documento desativado" : "Documento ativado" });
    } catch (error) {
      toast({ title: "Erro ao atualizar documento", variant: "destructive" });
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      const { error } = await supabase.from('ai_documents').delete().eq('id', docId);
      if (error) throw error;
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      toast({ title: "Documento excluído" });
    } catch (error) {
      toast({ title: "Erro ao excluir documento", variant: "destructive" });
    }
  };

  const updateDocumentEixo = async (docId: string, newEixoId: string | null) => {
    try {
      const { error } = await supabase
        .from('ai_documents')
        .update({ eixo_id: newEixoId })
        .eq('id', docId);
      if (error) throw error;
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === docId
            ? {
                ...doc,
                eixo_id: newEixoId,
                eixos_tematicos: newEixoId
                  ? { nome: eixos.find(e => e.id === newEixoId)?.nome || '' }
                  : null,
              }
            : doc,
        ),
      );
      toast({ title: 'Eixo atualizado' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar eixo', variant: 'destructive' });
    }
  };

  const updateDocumentTemas = async (docId: string, newTemaIds: string[]) => {
    try {
      const { error: delError } = await supabase
        .from('ai_document_temas')
        .delete()
        .eq('document_id', docId);
      if (delError) throw delError;

      if (newTemaIds.length > 0) {
        const rows = newTemaIds.map((tema_id) => ({ document_id: docId, tema_id }));
        const { error: insError } = await supabase.from('ai_document_temas').insert(rows);
        if (insError) throw insError;
      }

      // Refresh to get tema names
      await fetchDocuments();
      toast({ title: 'Temas atualizados' });
    } catch (error) {
      console.error('Erro ao atualizar temas:', error);
      toast({ title: 'Erro ao atualizar temas', variant: 'destructive' });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return doc.title.toLowerCase().includes(search) || doc.description?.toLowerCase().includes(search) || doc.content.toLowerCase().includes(search);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = filteredDocuments.length > 0 && filteredDocuments.every(d => selectedIds.has(d.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredDocuments.map(d => d.id)));
  };

  const sanitizeName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);

  const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split(/\r?\n/);
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push('');
        continue;
      }
      const words = paragraph.split(/\s+/);
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(test, size);
        if (width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  };

  const sanitizeForPdf = (text: string) =>
    (text || '')
      // pdf-lib WinAnsi can't render most emoji / unusual glyphs
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2013|\u2014/g, '-')
      .replace(/\u2026/g, '...');

  const addTextPages = async (
    pdf: PDFDocument,
    doc: AIDocument,
    font: any,
    boldFont: any,
  ) => {
    const pageSize: [number, number] = [595.28, 841.89]; // A4
    const margin = 50;
    const maxWidth = pageSize[0] - margin * 2;
    let page = pdf.addPage(pageSize);
    let y = pageSize[1] - margin;

    const draw = (text: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) => {
      const size = opts.size ?? 11;
      const usedFont = opts.bold ? boldFont : font;
      const lines = wrapText(sanitizeForPdf(text), usedFont, size, maxWidth);
      for (const line of lines) {
        if (y < margin + size) {
          page = pdf.addPage(pageSize);
          y = pageSize[1] - margin;
        }
        page.drawText(line, { x: margin, y, size, font: usedFont, color: rgb(0.1, 0.1, 0.1) });
        y -= size * 1.35;
      }
      y -= opts.gap ?? 4;
    };

    draw(doc.title || 'Documento', { size: 18, bold: true, gap: 8 });
    if (doc.description) draw(doc.description, { size: 11, gap: 8 });
    const meta = [
      DOC_CATEGORY_LABELS[doc.doc_category] || doc.doc_category,
      doc.eixos_tematicos?.nome ? `Eixo: ${doc.eixos_tematicos.nome}` : null,
      doc.municipios?.nome ? `Município: ${doc.municipios.nome}` : null,
      doc.regiao ? `Região: ${doc.regiao}` : null,
      new Date(doc.created_at).toLocaleDateString('pt-BR'),
    ].filter(Boolean).join(' • ');
    if (meta) draw(meta, { size: 9, gap: 12 });
    if (doc.content) draw(doc.content, { size: 11, gap: 6 });
    if (doc.source_url) draw(`Fonte: ${doc.source_url}`, { size: 9, gap: 4 });
  };

  const downloadDocuments = async (docs: AIDocument[]) => {
    if (docs.length === 0) {
      toast({ title: 'Nenhum documento para baixar', variant: 'destructive' });
      return;
    }
    setIsDownloading(true);
    try {
      const merged = await PDFDocument.create();
      const font = await merged.embedFont(StandardFonts.Helvetica);
      const boldFont = await merged.embedFont(StandardFonts.HelveticaBold);
      let embeddedPdfs = 0;
      let embeddedImages = 0;
      let textOnly = 0;

      for (const doc of docs) {
        // Always start with a metadata cover for context
        await addTextPages(merged, doc, font, boldFont);

        if (doc.file_url) {
          try {
            const res = await fetch(doc.file_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            const mime = (doc.file_type || '').toLowerCase();
            const nameLower = (doc.file_name || '').toLowerCase();
            const isPdf = mime.includes('pdf') || nameLower.endsWith('.pdf');
            const isJpg = mime.includes('jpeg') || mime.includes('jpg') || /\.jpe?g$/.test(nameLower);
            const isPng = mime.includes('png') || nameLower.endsWith('.png');

            if (isPdf) {
              const src = await PDFDocument.load(buf, { ignoreEncryption: true });
              const pages = await merged.copyPages(src, src.getPageIndices());
              pages.forEach((p) => merged.addPage(p));
              embeddedPdfs++;
            } else if (isJpg || isPng) {
              const img = isPng ? await merged.embedPng(buf) : await merged.embedJpg(buf);
              const pageSize: [number, number] = [595.28, 841.89];
              const page = merged.addPage(pageSize);
              const margin = 40;
              const maxW = pageSize[0] - margin * 2;
              const maxH = pageSize[1] - margin * 2;
              const scale = Math.min(maxW / img.width, maxH / img.height, 1);
              const w = img.width * scale;
              const h = img.height * scale;
              page.drawImage(img, {
                x: (pageSize[0] - w) / 2,
                y: (pageSize[1] - h) / 2,
                width: w,
                height: h,
              });
              embeddedImages++;
            } else {
              textOnly++;
            }
          } catch (e) {
            console.warn('Falha ao anexar arquivo ao PDF:', doc.title, e);
            textOnly++;
          }
        } else {
          textOnly++;
        }
      }

      const bytes = await merged.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const stamp = new Date().toISOString().slice(0, 10);
      saveAs(blob, `biblioteca-documentos-${stamp}.pdf`);
      toast({
        title: 'PDF gerado',
        description: `${docs.length} documento(s) — ${embeddedPdfs} PDF(s), ${embeddedImages} imagem(ns), ${textOnly} apenas texto.`,
      });
    } catch (error) {
      console.error('Erro no download:', error);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <BookOpen className="w-4 h-4 text-primary" />
              Biblioteca de Documentos
              <Badge variant="secondary" className="ml-2">
                {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={isDownloading || filteredDocuments.length === 0} className="whitespace-nowrap">
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Baixar PDF
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    disabled={selectedIds.size === 0 || isDownloading}
                    onClick={() =>
                      downloadDocuments(filteredDocuments.filter(d => selectedIds.has(d.id)))
                    }
                  >
                    Baixar selecionados ({selectedIds.size})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={isDownloading}
                    onClick={() => downloadDocuments(filteredDocuments)}
                  >
                    Baixar todos ({filteredDocuments.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => setShowUploadModal(true)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-full sm:min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar documentos..." className="pl-9" />
              </div>
            </div>
            
            <Select value={scopeFilter || "__all__"} onValueChange={(v) => setScopeFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos escopos</SelectItem>
                <SelectItem value="global">🌐 Globais</SelectItem>
                <SelectItem value="agent_specific">🤖 De agente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas categorias</SelectItem>
                {Object.entries(DOC_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status temporal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os status</SelectItem>
                {Object.entries(TEMPORAL_STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="show-inactive" className="text-sm">Mostrar inativos</Label>
            </div>
          </div>

          {filteredDocuments.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                id="select-all-docs"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="select-all-docs" className="text-xs text-muted-foreground cursor-pointer">
                {allSelected
                  ? 'Desmarcar todos'
                  : `Selecionar todos (${filteredDocuments.length})`}
                {selectedIds.size > 0 && ` — ${selectedIds.size} selecionado(s)`}
              </Label>
            </div>
          )}

          {/* Documents List */}
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[480px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">Nenhum documento encontrado</p>
                <Button variant="link" className="mt-2" onClick={() => setShowUploadModal(true)}>
                  Adicionar primeiro documento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((doc) => {
                  const statusConfig = doc.temporal_status ? TEMPORAL_STATUS_CONFIG[doc.temporal_status] : null;
                  const StatusIcon = statusConfig?.icon;

                  return (
                    <div 
                      key={doc.id}
                      className={cn(
                        'p-3 rounded-lg border transition-colors',
                        doc.is_active ? 'bg-card border-border' : 'bg-muted/50 border-muted opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <Checkbox
                          className="mt-1"
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={() => toggleSelect(doc.id)}
                          aria-label={`Selecionar ${doc.title}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="font-medium truncate">{doc.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {DOC_CATEGORY_LABELS[doc.doc_category] || doc.doc_category}
                            </Badge>
                            {doc.scope !== 'global' && (
                              <Badge variant="default" className="text-[10px] gap-1">
                                <Bot className="w-3 h-3" /> Específico de agente
                              </Badge>
                            )}
                            {statusConfig && StatusIcon && (
                              <Badge variant="secondary" className={cn('text-xs gap-1', statusConfig.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                            )}
                          </div>
                          
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{doc.description}</p>
                          )}

                          {/* Temas vinculados */}
                          {doc.temas && doc.temas.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              {doc.temas.slice(0, 6).map(t => (
                                <Badge key={t.id} variant="outline" className="text-[10px] py-0">
                                  {t.nome}
                                </Badge>
                              ))}
                              {doc.temas.length > 6 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{doc.temas.length - 6}
                                </span>
                              )}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                                    <Pencil className="w-3 h-3" /> Editar
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[360px] p-2" align="start">
                                  <TemasMultiSelect
                                    value={(doc.temas || []).map((t) => t.id)}
                                    onChange={(ids) => updateDocumentTemas(doc.id, ids)}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 gap-1 text-[10px] text-amber-600 hover:text-amber-700 border border-amber-500/40 bg-amber-500/10"
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                    Sem tema vinculado — clique para vincular
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[360px] p-2" align="start">
                                  <TemasMultiSelect
                                    value={[]}
                                    onChange={(ids) => updateDocumentTemas(doc.id, ids)}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}

                          {/* Agentes/ferramentas vinculados */}
                          <DocumentAgentLinker
                            documentId={doc.id}
                            onChanged={fetchDocuments}
                          />

                          {/* Vincular Eixo Temático */}
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-xs text-muted-foreground">Eixo:</Label>
                            <Select
                              value={doc.eixo_id || '__none__'}
                              onValueChange={(v) =>
                                updateDocumentEixo(doc.id, v === '__none__' ? null : v)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-[260px]">
                                <SelectValue placeholder="Selecionar eixo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Sem eixo</SelectItem>
                                {eixos.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {e.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {doc.regiao && <span>Região: {doc.regiao}</span>}
                            {doc.municipios && <span>Município: {doc.municipios.nome}</span>}
                            <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {doc.source_url && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.source_url!, '_blank')}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleDocumentActive(doc.id, doc.is_active)} title={doc.is_active ? 'Desativar' : 'Ativar'}>
                            {doc.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteDocument(doc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <DocumentUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onSuccess={fetchDocuments}
        eixos={eixos}
        municipios={municipios}
        regioes={regioes}
      />
    </>
  );
}

export default DocumentLibrary;
