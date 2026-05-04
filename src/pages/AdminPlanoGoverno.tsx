import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';
import ModeConfigPanel from '@/components/admin/ModeConfigPanel';
import AnalysisModeSelector, { type AnalysisMode } from '@/components/admin/AnalysisModeSelector';
import DataSourceFilters, { type DataFilters } from '@/components/admin/DataSourceFilters';
import DocumentLibrary from '@/components/admin/DocumentLibrary';
import { FichamentoExportButton } from '@/components/admin/FichamentoExportButton';
import { GovernmentBalanceChart, type BalanceData } from '@/components/admin/GovernmentBalanceChart';
import { CrossReferenceResultsPanel } from '@/components/admin/CrossReferenceResultsPanel';
import { BalanceDetailModal, type BalanceItem } from '@/components/admin/BalanceDetailModal';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Copy,
  Loader2,
  BookOpen,
  MessageSquare,
  Settings,
  Maximize2,
  Minimize2,
  Plus,
  History,
  Trash2,
  Pencil,
  Check,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseCrossReferenceContent } from '@/utils/crossReferenceParser';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Municipio = {
  id: string;
  nome: string;
  regiao: string | null;
};

type Eixo = {
  id: string;
  nome: string;
};

type Tema = { id: string; nome: string; eixo_id: string };
type Subtema = { id: string; nome: string; tema_id: string };

type ConversationListItem = {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
};

const REGIOES = [
  'Campos Gerais',
  'Centro Ocidental',
  'Centro-Sul',
  'Litoral',
  'Metropolitana de Curitiba',
  'Noroeste',
  'Norte Central',
  'Norte Pioneiro',
  'Oeste',
  'Sudoeste'
];

const MODE_LABELS: Record<string, string> = {
  plano: 'Plano de Governo',
  brainstorm: 'Brainstorm',
  cruzamento: 'Cruzamento de Dados',
  balanco: 'Balanço de Governo',
  conteudo: 'Geração de Conteúdo',
  coerencia: 'Análise de Coerência',
};

const AdminPlanoGoverno = () => {
  const { user, roles, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mode state
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('plano');
  const [activeTab, setActiveTab] = useState('chat');

  // Unified filters
  const [filters, setFilters] = useState<DataFilters>({
    includeSugestoes: true,
    includePropostas: true,
    includeDocumentos: true,
    regiao: '',
    municipio: '',
    eixo: '',
    tema: '',
    subtema: '',
    documentIds: [],
    docCategory: [],
    temporalStatus: '',
  });

  // Data
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<{ id: string; title: string; doc_category: string; temporal_status: string | null }[]>([]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // History state
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Balance and cross-reference data
  const [balanceData, setBalanceData] = useState<BalanceData[]>([]);
  const [balanceRawData, setBalanceRawData] = useState<{
    documents: Array<{id: string; title: string; eixo_id: string | null; temporal_status: string | null; file_url: string | null; source_url: string | null}>;
    proposals: Array<{id: string; titulo: string; eixo_id: string; status: string; anexos: string[] | null}>;
  }>({ documents: [], proposals: [] });
  const [crossRefResults, setCrossRefResults] = useState<{
    type: 'convergence' | 'divergence' | 'gap' | 'opportunity';
    title: string;
    description: string;
    sources: string[];
    relevance: 'high' | 'medium' | 'low';
  }[]>([]);
  const [crossRefStats, setCrossRefStats] = useState<{
    sugestoes: number;
    propostas: number;
    documentos: number;
  }>({ sugestoes: 0, propostas: 0, documentos: 0 });
  const [loadingBalanceData, setLoadingBalanceData] = useState(false);
  
  // Fullscreen chat state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Balance detail modal state
  const [balanceDetailModal, setBalanceDetailModal] = useState<{
    open: boolean;
    category: 'realizado' | 'em_andamento' | 'prometido' | 'nao_iniciado' | null;
    eixo?: string;
  }>({ open: false, category: null });

  // Check authorization
  const isAuthorized = isAdmin || hasRole('lider_tematico');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAuthorized) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
      navigate('/admin');
    }
  }, [user, authLoading, isAuthorized, navigate, toast]);

  // Fetch municipios and eixos
  useEffect(() => {
    const fetchData = async () => {
      const [municipiosRes, eixosRes, docsRes, temasRes, subtemasRes] = await Promise.all([
        supabase.from('municipios').select('id, nome, regiao').order('nome'),
        supabase.from('eixos_tematicos').select('id, nome').order('nome'),
        supabase
          .from('ai_documents')
          .select('id, title, doc_category, temporal_status')
          .eq('is_active', true)
          .order('title'),
        supabase.from('temas').select('id, nome, eixo_id').order('nome'),
        supabase.from('subtemas').select('id, nome, tema_id').order('nome'),
      ]);

      if (municipiosRes.data) setMunicipios(municipiosRes.data);
      if (eixosRes.data) setEixos(eixosRes.data);
      if (docsRes.data) setAvailableDocuments(docsRes.data);
      if (temasRes.data) setTemas(temasRes.data as Tema[]);
      if (subtemasRes.data) setSubtemas(subtemasRes.data as Subtema[]);
    };

    if (user && isAuthorized) {
      fetchData();
    }
  }, [user, isAuthorized]);

  // Fetch balance and cross-reference data
  useEffect(() => {
    const fetchBalanceData = async () => {
      if (!user || !isAuthorized || !eixos.length) return;
      
      setLoadingBalanceData(true);
      try {
        // Get eixo_id if filter is active
        const selectedEixo = filters.eixo ? eixos.find(e => e.nome === filters.eixo) : null;
        const eixoId = selectedEixo?.id || null;

        // Build documents query with filters - include fields for detail modal
        let documentsQuery = supabase.from('ai_documents').select('id, title, eixo_id, temporal_status, doc_category, file_url, source_url');
        if (eixoId) {
          documentsQuery = documentsQuery.eq('eixo_id', eixoId);
        }
        if (filters.documentIds.length > 0) {
          documentsQuery = documentsQuery.in('id', filters.documentIds);
        } else if (filters.docCategory.length > 0) {
          documentsQuery = documentsQuery.in('doc_category', filters.docCategory);
        }
        if (filters.temporalStatus) {
          documentsQuery = documentsQuery.eq('temporal_status', filters.temporalStatus);
        }

        // Build proposals query with filters - include fields for detail modal
        let proposalsQuery = supabase.from('propostas_tecnicas').select('id, titulo, eixo_id, status, municipio_id, anexos');
        if (eixoId) {
          proposalsQuery = proposalsQuery.eq('eixo_id', eixoId);
        }
        if (filters.municipio) {
          const selectedMunicipio = municipios.find(m => m.nome === filters.municipio);
          if (selectedMunicipio) {
            proposalsQuery = proposalsQuery.eq('municipio_id', selectedMunicipio.id);
          }
        }

        // Build suggestions query with filters
        let suggestionsQuery = supabase.from('sugestoes_populares').select('eixo, municipio');
        if (filters.eixo) {
          suggestionsQuery = suggestionsQuery.eq('eixo', filters.eixo);
        }
        if (filters.municipio) {
          suggestionsQuery = suggestionsQuery.eq('municipio', filters.municipio);
        }

        // Execute queries
        const [documentsRes, proposalsRes, suggestionsRes] = await Promise.all([
          documentsQuery,
          proposalsQuery,
          suggestionsQuery
        ]);

        const documents = documentsRes.data || [];
        const proposals = proposalsRes.data || [];

        // Map proposal status to temporal categories
        const statusToTemporal: Record<string, string> = {
          'aprovada': 'realizado',
          'em_analise': 'em_andamento',
          'rascunho': 'nao_iniciado',
        };

        // Build balance data - if eixo filter is active, only show that eixo
        const eixosToShow = selectedEixo ? [selectedEixo] : eixos;
        const balanceByEixo = eixosToShow.map(eixo => {
          const eixoDocs = documents.filter(d => d.eixo_id === eixo.id);
          const eixoProposals = proposals.filter(p => p.eixo_id === eixo.id);
          
          return {
            eixo: eixo.nome.length > 15 ? eixo.nome.substring(0, 15) + '...' : eixo.nome,
            realizado: 
              eixoDocs.filter(d => d.temporal_status === 'realizado').length +
              eixoProposals.filter(p => p.status === 'aprovada').length,
            em_andamento: 
              eixoDocs.filter(d => d.temporal_status === 'em_andamento').length +
              eixoProposals.filter(p => p.status === 'em_analise').length,
            prometido: 
              eixoDocs.filter(d => d.temporal_status === 'prometido').length,
            nao_iniciado: 
              eixoDocs.filter(d => d.temporal_status === 'nao_iniciado').length +
              eixoProposals.filter(p => p.status === 'rascunho').length,
          };
        });

        setBalanceData(balanceByEixo);
        
        // Store raw data for detail modal
        setBalanceRawData({
          documents: documents.map(d => ({
            id: d.id,
            title: d.title,
            eixo_id: d.eixo_id,
            temporal_status: d.temporal_status,
            file_url: d.file_url,
            source_url: d.source_url,
          })),
          proposals: proposals.map(p => ({
            id: p.id,
            titulo: p.titulo,
            eixo_id: p.eixo_id,
            status: p.status,
            anexos: p.anexos,
          })),
        });
        
        // Set cross-ref stats respecting source toggles
        setCrossRefStats({
          sugestoes: filters.includeSugestoes ? (suggestionsRes.data?.length || 0) : 0,
          propostas: filters.includePropostas ? (proposalsRes.data?.length || 0) : 0,
          documentos: filters.includeDocumentos ? (documents?.length || 0) : 0,
        });
      } catch (error) {
        console.error('Error fetching balance data:', error);
      } finally {
        setLoadingBalanceData(false);
      }
    };

    fetchBalanceData();
  }, [user, isAuthorized, eixos, municipios, filters]);

  // Get items for balance detail modal
  const getItemsForCategory = (category: 'realizado' | 'em_andamento' | 'prometido' | 'nao_iniciado', eixoName?: string): BalanceItem[] => {
    const statusMap = {
      realizado: { docStatus: 'realizado', proposalStatus: 'aprovada' },
      em_andamento: { docStatus: 'em_andamento', proposalStatus: 'em_analise' },
      prometido: { docStatus: 'prometido', proposalStatus: '' },
      nao_iniciado: { docStatus: 'nao_iniciado', proposalStatus: 'rascunho' },
    };
    
    const mapping = statusMap[category];
    const selectedEixo = eixoName ? eixos.find(e => e.nome === eixoName || e.nome.startsWith(eixoName.replace('...', ''))) : null;
    
    const docItems: BalanceItem[] = balanceRawData.documents
      .filter(d => d.temporal_status === mapping.docStatus)
      .filter(d => !selectedEixo || d.eixo_id === selectedEixo.id)
      .map(d => ({
        id: d.id,
        title: d.title,
        sourceType: 'documento' as const,
        sourceUrl: d.file_url || d.source_url || undefined,
      }));
      
    const proposalItems: BalanceItem[] = balanceRawData.proposals
      .filter(p => p.status === mapping.proposalStatus)
      .filter(p => !selectedEixo || p.eixo_id === selectedEixo.id)
      .map(p => ({
        id: p.id,
        title: p.titulo,
        sourceType: 'proposta' as const,
        internalPath: `/admin/propostas?id=${p.id}`,
      }));
    
    return [...docItems, ...proposalItems];
  };

  // Handle balance category click
  const handleBalanceCategoryClick = (category: 'realizado' | 'em_andamento' | 'prometido' | 'nao_iniciado', eixo?: string) => {
    setBalanceDetailModal({
      open: true,
      category,
      eixo,
    });
  };

  // ---------------------------------------------------------------------------
  // Histórico de conversas
  // ---------------------------------------------------------------------------
  const loadConversations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('plano_governo_conversations' as any)
      .select('id, title, mode, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(80);
    if (!error && data) setConversations(data as unknown as ConversationListItem[]);
  };

  useEffect(() => {
    if (user && isAuthorized) loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthorized]);

  const persistConversation = async (
    nextMessages: Message[],
    overrideTitle?: string
  ): Promise<string | null> => {
    if (!user || nextMessages.length === 0) return currentConversationId;

    const firstUser = nextMessages.find(m => m.role === 'user');
    const inferredTitle = (overrideTitle ?? firstUser?.content ?? 'Nova conversa')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'Nova conversa';

    if (currentConversationId) {
      const { error } = await supabase
        .from('plano_governo_conversations' as any)
        .update({
          messages: nextMessages as any,
          mode: analysisMode,
          filters: filters as any,
          ...(overrideTitle ? { title: inferredTitle } : {}),
        } as any)
        .eq('id', currentConversationId);
      if (error) console.error('Erro atualizando conversa:', error);
      loadConversations();
      return currentConversationId;
    }

    const { data, error } = await supabase
      .from('plano_governo_conversations' as any)
      .insert({
        user_id: user.id,
        title: inferredTitle,
        mode: analysisMode,
        filters: filters as any,
        messages: nextMessages as any,
      } as any)
      .select('id')
      .single();
    if (error) {
      console.error('Erro criando conversa:', error);
      return null;
    }
    const newId = (data as any)?.id ?? null;
    if (newId) setCurrentConversationId(newId);
    loadConversations();
    return newId;
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setCrossRefResults([]);
  };

  const openConversation = async (id: string) => {
    const { data, error } = await supabase
      .from('plano_governo_conversations' as any)
      .select('id, title, mode, filters, messages')
      .eq('id', id)
      .single();
    if (error || !data) {
      toast({ title: 'Erro', description: 'Não foi possível abrir a conversa', variant: 'destructive' });
      return;
    }
    const c = data as any;
    setCurrentConversationId(c.id);
    setMessages((c.messages as Message[]) || []);
    if (c.mode) setAnalysisMode(c.mode as AnalysisMode);
    if (c.filters) {
      setFilters(prev => ({ ...prev, ...(c.filters as Partial<DataFilters>) }));
    }
    setActiveTab('chat');
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase
      .from('plano_governo_conversations' as any)
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' });
      return;
    }
    if (currentConversationId === id) startNewConversation();
    loadConversations();
  };

  const renameConversation = async (id: string, newTitle: string) => {
    const t = newTitle.trim().slice(0, 80);
    if (!t) return;
    await supabase
      .from('plano_governo_conversations' as any)
      .update({ title: t } as any)
      .eq('id', id);
    setRenamingId(null);
    loadConversations();
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);

    try {
      const payload = {
        messages: [...messages, userMessage],
        mode: analysisMode,
        filters: {
          // Data sources
          includeSugestoes: filters.includeSugestoes,
          includePropostas: filters.includePropostas,
          includeDocumentos: filters.includeDocumentos,
          // Location
          regiao: filters.regiao || undefined,
          cidade: filters.municipio || undefined,
          // Thematic
          eixo: filters.eixo || undefined,
          // Document specific
          documentIds: filters.documentIds.length > 0 ? filters.documentIds : undefined,
          docCategory: filters.docCategory.length > 0 ? filters.docCategory : undefined,
          temporalStatus: filters.temporalStatus || undefined,
        }
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plano-governo-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso não autorizado');
        }
        if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        }
        throw new Error('Erro ao processar mensagem');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream não disponível');

      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent
                  };
                  return newMessages;
                });
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // After streaming is complete, parse cross-reference results if in cruzamento mode
      if (analysisMode === 'cruzamento' && assistantContent) {
        parseCrossReferenceResults(assistantContent);
      }

      // Persiste a conversa após cada resposta da IA
      const finalMessages: Message[] = [
        ...messages,
        userMessage,
        { role: 'assistant', content: assistantContent },
      ];
      persistConversation(finalMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar mensagem",
        variant: "destructive"
      });
      // Remove the empty assistant message if error
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsStreaming(false);
    }
  };

  // Parse cross-reference results using robust 3-layer parser
  const parseCrossReferenceResults = (content: string) => {
    const { results, method } = parseCrossReferenceContent(content);
    
    if (results.length > 0) {
      setCrossRefResults(results);
      toast({
        title: `${results.length} descobertas identificadas`,
        description: `Método de extração: ${method === 'json' ? 'JSON estruturado' : 'Análise de texto'}`,
      });
    } else {
      console.warn('Nenhuma descoberta estruturada encontrada na resposta');
    }
  };

  const handleCopyLastResponse = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content);
      toast({
        title: "Copiado!",
        description: "Resposta copiada para a área de transferência"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    startNewConversation();
  };

  const getModeDescription = () => {
    switch (analysisMode) {
      case 'plano':
        return 'Crie planos de governo técnicos e profissionais';
      case 'brainstorm':
        return 'Gere ideias criativas baseadas nas demandas populares';
      case 'cruzamento':
        return 'Compare documentos, propostas e sugestões';
      case 'balanco':
        return 'Analise o que foi feito vs. prometido';
      case 'conteudo':
        return 'Gere releases, discursos e notas técnicas';
      case 'coerencia':
        return 'Avalie alinhamento entre propostas e documentos';
      default:
        return 'Solicite análises e insights baseados nos dados';
    }
  };

  const getExamplePrompts = () => {
    switch (analysisMode) {
      case 'plano':
        return [
          '"Crie um plano de governo para o eixo de saúde"',
          '"Elabore metas e indicadores para educação"',
          '"Estruture um plano integrado para desenvolvimento econômico"',
        ];
      case 'brainstorm':
        return [
          '"Sugira propostas para saúde baseadas nas demandas da população"',
          '"Crie pontos de discurso sobre educação para esta região"',
          '"Quais são as principais demandas da população sobre infraestrutura?"',
        ];
      case 'cruzamento':
        return [
          '"Compare as propostas técnicas com as sugestões populares de infraestrutura"',
          '"Identifique lacunas entre o plano de governo e as propostas existentes"',
          '"Cruze os documentos de investimento com as demandas populares"',
        ];
      case 'balanco':
        return [
          '"Analise o que foi realizado no eixo de saúde"',
          '"Compare o prometido vs. realizado em infraestrutura"',
          '"Gere um relatório de cumprimento de metas por região"',
        ];
      case 'conteudo':
        return [
          '"Crie um release de imprensa sobre as realizações em educação"',
          '"Elabore um discurso político sobre desenvolvimento regional"',
          '"Gere uma nota técnica sobre os investimentos em infraestrutura"',
        ];
      case 'coerencia':
        return [
          '"Avalie a coerência das propostas de saúde com o plano de governo"',
          '"Identifique propostas desalinhadas com as diretrizes oficiais"',
          '"Classifique as propostas por exequibilidade técnica"',
        ];
      default:
        return [];
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-display font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Análise, Diagnóstico e Propostas (IA avançada)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Cruzamento inteligente de dados para geração de insights e propostas
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearChat}>
                Limpar Chat
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Mode Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Modo de Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalysisModeSelector 
                value={analysisMode} 
                onChange={(mode) => {
                  setAnalysisMode(mode);
                  clearChat();
                }} 
              />
            </CardContent>
          </Card>

          {/* Tabs: Chat / Documents / Config */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat de Análise
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Biblioteca de Documentos
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-4 mt-4">
              {/* Filters */}
              <DataSourceFilters
                filters={filters}
                onChange={setFilters}
                regioes={REGIOES}
                municipios={municipios}
                eixos={eixos}
                documents={availableDocuments}
              />

              {/* Contextual Charts based on mode */}
              {(analysisMode === 'balanco' || analysisMode === 'cruzamento') && (
                <GovernmentBalanceChart
                  data={balanceData}
                  isLoading={loadingBalanceData}
                  onCategoryClick={handleBalanceCategoryClick}
                />
              )}

              {analysisMode === 'cruzamento' && (
                <CrossReferenceResultsPanel
                  results={crossRefResults}
                  aiAnalysis={messages.filter(m => m.role === 'assistant').pop()?.content}
                  isLoading={isStreaming}
                  stats={crossRefStats}
                />
              )}

              {/* Chat Area */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Conversa
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(true)}
                    title="Expandir chat"
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Expandir</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px] p-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                        <Sparkles className="w-12 h-12 mb-4 text-primary/30" />
                        <h3 className="text-lg font-medium mb-2">
                          {getModeDescription()}
                        </h3>
                        <div className="mt-4 text-sm">
                          <p className="font-medium text-foreground mb-2">Exemplos de perguntas:</p>
                          <ul className="space-y-1">
                            {getExamplePrompts().map((prompt, i) => (
                              <li key={i}>• {prompt}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {message.role === 'assistant' ? (
                                message.content ? (
                                  <>
                                    <MarkdownRenderer content={message.content} />
                                    <div className="flex justify-end mt-2 -mb-1">
                                      <FichamentoExportButton
                                        content={message.content}
                                        title={`${MODE_LABELS[analysisMode] || 'Plano de Governo'}`}
                                        modeLabel={MODE_LABELS[analysisMode]}
                                        filtersSummary={[
                                          filters.eixo && `Eixo: ${filters.eixo}`,
                                          filters.regiao && `Região: ${filters.regiao}`,
                                          filters.municipio && `Município: ${filters.municipio}`,
                                        ].filter(Boolean).join(' · ')}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <span className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Pensando...
                                  </span>
                                )
                              ) : (
                                <div className="whitespace-pre-wrap text-sm">
                                  {message.content}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Input Area */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Faça uma pergunta no modo ${analysisMode}...`}
                  disabled={isStreaming}
                  className="flex-1"
                />
                {messages.some(m => m.role === 'assistant' && m.content) && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLastResponse}
                    title="Copiar última resposta"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputMessage.trim() || isStreaming}
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <DocumentLibrary
                eixos={eixos}
                municipios={municipios}
                regioes={REGIOES}
              />
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value="config" className="mt-4">
              <ModeConfigPanel isAdmin={isAdmin} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Balance Detail Modal */}
      <BalanceDetailModal
        open={balanceDetailModal.open}
        onOpenChange={(open) => setBalanceDetailModal(prev => ({ ...prev, open }))}
        category={balanceDetailModal.category}
        items={balanceDetailModal.category ? getItemsForCategory(balanceDetailModal.category, balanceDetailModal.eixo) : []}
        eixoFilter={balanceDetailModal.eixo}
      />

      {/* Fullscreen Chat Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Chat Expandido - Modo: {analysisMode.charAt(0).toUpperCase() + analysisMode.slice(1)}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="mr-8"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="ml-1">Reduzir</span>
            </Button>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                    <Sparkles className="w-12 h-12 mb-4 text-primary/30" />
                    <h3 className="text-lg font-medium mb-2">
                      {getModeDescription()}
                    </h3>
                    <div className="mt-4 text-sm">
                      <p className="font-medium text-foreground mb-2">Exemplos de perguntas:</p>
                      <ul className="space-y-1">
                        {getExamplePrompts().map((prompt, i) => (
                          <li key={i}>• {prompt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          message.content ? (
                            <>
                              <MarkdownRenderer content={message.content} />
                              <div className="flex justify-end mt-2 -mb-1">
                                <FichamentoExportButton
                                  content={message.content}
                                  title={`${MODE_LABELS[analysisMode] || 'Plano de Governo'}`}
                                  modeLabel={MODE_LABELS[analysisMode]}
                                  filtersSummary={[
                                    filters.eixo && `Eixo: ${filters.eixo}`,
                                    filters.regiao && `Região: ${filters.regiao}`,
                                    filters.municipio && `Município: ${filters.municipio}`,
                                  ].filter(Boolean).join(' · ')}
                                />
                              </div>
                            </>
                          ) : (
                            <span className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Pensando...
                            </span>
                          )
                        ) : (
                          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="flex gap-2 p-4 border-t shrink-0">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Faça uma pergunta no modo ${analysisMode}...`}
                disabled={isStreaming}
                className="flex-1"
              />
              {messages.some(m => m.role === 'assistant' && m.content) && (
                <Button variant="outline" size="icon" onClick={handleCopyLastResponse} title="Copiar">
                  <Copy className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isStreaming}>
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlanoGoverno;
