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
import { 
  BookOpen, Plus, Search, FileText, Eye, EyeOff, Trash2,
  ExternalLink, Filter, Loader2, CheckCircle, Clock, AlertCircle, Circle,
  Globe, Bot, Tag, AlertTriangle
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

  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return doc.title.toLowerCase().includes(search) || doc.description?.toLowerCase().includes(search) || doc.content.toLowerCase().includes(search);
  });

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Biblioteca de Documentos
              <Badge variant="secondary" className="ml-2">
                {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <Button size="sm" onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar documentos..." className="pl-9" />
              </div>
            </div>
            
            <Select value={scopeFilter || "__all__"} onValueChange={(v) => setScopeFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos escopos</SelectItem>
                <SelectItem value="global">🌐 Globais</SelectItem>
                <SelectItem value="agent_specific">🤖 De agente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="font-medium truncate">{doc.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {DOC_CATEGORY_LABELS[doc.doc_category] || doc.doc_category}
                            </Badge>
                            {doc.scope === 'global' ? (
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <Globe className="w-3 h-3" /> Global
                              </Badge>
                            ) : (
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
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Sem tema vinculado — atualizar
                              </Badge>
                            </div>
                          )}

                          {/* Agentes/ferramentas vinculados */}
                          <DocumentAgentLinker
                            documentId={doc.id}
                            onChanged={fetchDocuments}
                          />

                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {doc.eixos_tematicos && <span>Eixo: {doc.eixos_tematicos.nome}</span>}
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
