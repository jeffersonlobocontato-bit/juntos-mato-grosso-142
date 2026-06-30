import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Wand2, Undo2, Save, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FORMATOS_DISPONIVEIS } from "./CommsContentSourceSelector";

interface TemaConvergente {
  tema: string;
  subtemas: string[];
  justificativa: string;
}

export interface CommsGenerationResult {
  id: string;
  contexto: string;
  temas_mapeados: TemaConvergente[];
  conteudos: Record<string, string>;
  formatos_gerados: string[];
  created_at: string;
}

interface CommsContentEditorProps {
  generation: CommsGenerationResult;
  onSaved?: (updated: CommsGenerationResult) => void;
}

// Comandos rápidos sugeridos — pensados para uso em trânsito/celular (toque único)
const QUICK_COMMANDS = [
  'Deixe mais curto',
  'Tom mais formal',
  'Tom mais direto',
  'Adicione um dado concreto',
  'Simplifique a linguagem',
];

export const CommsContentEditor: React.FC<CommsContentEditorProps> = ({ generation, onSaved }) => {
  const formatosOrdenados = FORMATOS_DISPONIVEIS.filter(f =>
    generation.formatos_gerados.includes(f.id)
  );

  const [activeTab, setActiveTab] = useState(formatosOrdenados[0]?.id || 'pit');
  const [textos, setTextos] = useState<Record<string, string>>({ ...generation.conteudos });
  const [historico, setHistorico] = useState<Record<string, string[]>>({});
  const [comando, setComando] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resetar estado local quando trocar de geração (ex: clicou em outro item do histórico)
  useEffect(() => {
    setTextos({ ...generation.conteudos });
    setHistorico({});
    setDirty(false);
    setActiveTab(formatosOrdenados[0]?.id || 'pit');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation.id]);

  const textoAtual = textos[activeTab] || '';
  const wordCount = textoAtual.trim() ? textoAtual.trim().split(/\s+/).length : 0;

  const updateTexto = (formato: string, novoTexto: string, pushHistory = true) => {
    setTextos(prev => {
      if (pushHistory && prev[formato] !== undefined) {
        setHistorico(h => ({
          ...h,
          [formato]: [...(h[formato] || []), prev[formato]],
        }));
      }
      return { ...prev, [formato]: novoTexto };
    });
    setDirty(true);
  };

  const handleManualEdit = (value: string) => {
    setTextos(prev => ({ ...prev, [activeTab]: value }));
    setDirty(true);
  };

  const handleUndo = () => {
    const pilha = historico[activeTab];
    if (!pilha || pilha.length === 0) return;
    const anterior = pilha[pilha.length - 1];
    setHistorico(h => ({ ...h, [activeTab]: h[activeTab].slice(0, -1) }));
    setTextos(prev => ({ ...prev, [activeTab]: anterior }));
    setDirty(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(textoAtual);
    toast.success('Texto copiado');
  };

  const runComando = async (instrucao: string) => {
    if (!instrucao.trim()) return;
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke('refine-comms-content', {
        body: {
          textoAtual,
          instrucao,
          contexto: generation.contexto,
          formato: activeTab,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      updateTexto(activeTab, data.texto);
      setComando('');
      toast.success('Texto atualizado pela IA');
    } catch (err: any) {
      console.error('Erro ao refinar texto:', err);
      toast.error(err?.message || 'Erro ao aplicar comando');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('comms_content_generations')
        .update({ conteudos: textos })
        .eq('id', generation.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Alterações salvas');
      setDirty(false);
      if (data) onSaved?.(data as unknown as CommsGenerationResult);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Temas mapeados — compacto, sempre visível */}
      {generation.temas_mapeados && generation.temas_mapeados.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30 text-sm">
          <Tag className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {generation.temas_mapeados.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {t.tema}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${formatosOrdenados.length}, 1fr)` }}
        >
          {formatosOrdenados.map((f) => (
            <TabsTrigger key={f.id} value={f.id} className="text-xs sm:text-sm">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {formatosOrdenados.map((f) => (
          <TabsContent key={f.id} value={f.id} className="space-y-3 mt-3">
            {/* Editor de texto, estilo documento */}
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
                <span className="text-xs text-muted-foreground">{f.desc}</span>
                <span className="text-xs text-muted-foreground">{wordCount} palavras</span>
              </div>
              <Textarea
                ref={textareaRef}
                value={textoAtual}
                onChange={(e) => handleManualEdit(e.target.value)}
                className="min-h-[280px] sm:min-h-[320px] border-0 rounded-none resize-y text-base leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 p-4"
                placeholder="O texto gerado pela IA aparecerá aqui..."
              />
            </div>

            {/* Barra de comando à IA — prioridade mobile: chips grandes, toque fácil */}
            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {QUICK_COMMANDS.map((cmd) => (
                  <Button
                    key={cmd}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-8 text-xs whitespace-nowrap"
                    disabled={isRefining}
                    onClick={() => runComando(cmd)}
                  >
                    {cmd}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={comando}
                  onChange={(e) => setComando(e.target.value)}
                  placeholder="Diga à IA o que ajustar neste texto..."
                  className="flex-1 h-11"
                  disabled={isRefining}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      runComando(comando);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  disabled={isRefining || !comando.trim()}
                  onClick={() => runComando(comando)}
                >
                  {isRefining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Ações: desfazer, copiar, salvar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!historico[activeTab]?.length}
                onClick={handleUndo}
              >
                <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                Desfazer
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copiar
              </Button>
              <Button
                type="button"
                size="sm"
                className="ml-auto"
                disabled={!dirty || isSaving}
                onClick={handleSave}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                {dirty ? 'Salvar alterações' : 'Salvo'}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
