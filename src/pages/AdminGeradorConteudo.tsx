import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CommsContentSourceSelector,
  CommsSourceSelection,
} from "@/components/admin/CommsContentSourceSelector";
import {
  CommsContentEditor,
  CommsGenerationResult,
} from "@/components/admin/CommsContentEditor";

const initialSelection: CommsSourceSelection = {
  documentIds: [],
  sugestaoIds: [],
  pesquisaIds: [],
  propostaIds: [],
  propostaInstitucionalIds: [],
  propostaPoliticaIds: [],
  eixoFiltroId: null,
  subtemaFiltroIds: [],
};

export default function AdminGeradorConteudo() {
  const [contexto, setContexto] = useState("");
  const [sourceSelection, setSourceSelection] = useState<CommsSourceSelection>(initialSelection);
  const [formatosSelecionados, setFormatosSelecionados] = useState<string[]>(["pit", "release"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<CommsGenerationResult | null>(null);
  const [history, setHistory] = useState<CommsGenerationResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from("comms_content_generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data as unknown as CommsGenerationResult[]);
    }
    setIsLoadingHistory(false);
  };

  const handleGenerate = async () => {
    if (!contexto || contexto.trim().length < 5) {
      toast.error("Descreva o contexto/briefing do evento antes de gerar.");
      return;
    }
    if (formatosSelecionados.length === 0) {
      toast.error("Selecione ao menos um formato de conteúdo.");
      return;
    }

    setIsGenerating(true);
    setCurrentResult(null);

    try {
      // Propostas técnicas e institucionais compartilham a mesma tabela de origem
      // (propostas_tecnicas), diferenciadas apenas por tipo_proposta na consulta;
      // por isso ambas são enviadas juntas no mesmo campo propostaIds.
      const propostaIdsCombinadas = [
        ...sourceSelection.propostaIds,
        ...sourceSelection.propostaInstitucionalIds,
      ];

      const { data, error } = await supabase.functions.invoke("generate-comms-content", {
        body: {
          contexto,
          sources: {
            documentIds: sourceSelection.documentIds,
            sugestaoIds: sourceSelection.sugestaoIds,
            pesquisaIds: sourceSelection.pesquisaIds,
            propostaIds: propostaIdsCombinadas,
            propostaPoliticaIds: sourceSelection.propostaPoliticaIds,
            eixoFiltroId: sourceSelection.eixoFiltroId,
            subtemaFiltroIds: sourceSelection.subtemaFiltroIds,
          },
          formatos: formatosSelecionados,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCurrentResult(data.generation as CommsGenerationResult);
      toast.success("Conteúdo gerado com sucesso");
      fetchHistory();
    } catch (err: any) {
      console.error("Erro ao gerar conteúdo:", err);
      toast.error(err?.message || "Erro ao gerar conteúdo");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-6">
      {/* Header compacto, fixo no topo no mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-base sm:text-lg font-bold truncate">Gerador de Conteúdo</h1>
          </div>

          {/* Histórico — Sheet lateral (permanece como gaveta, não faz parte do fluxo de fontes) */}
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle>Histórico de gerações</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2 pb-6">
                    {history.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nenhuma geração ainda.</p>
                    )}
                    {history.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          setCurrentResult(h);
                          setHistoryOpen(false);
                        }}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-sm font-medium line-clamp-2">{h.contexto}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {h.formatos_gerados?.map((f) => (
                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(h.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-4xl space-y-4">
        {/* Briefing — sempre visível, estilo "chat" */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <label htmlFor="contexto" className="text-sm font-medium text-foreground">
              Briefing / contexto do evento
            </label>
            <Textarea
              id="contexto"
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder='Ex: "Viagem ao Sudeste, evento com agricultores em Londrina"'
              className="min-h-[90px] text-base"
            />
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex flex-wrap gap-1">
                {formatosSelecionados.map((f) => (
                  <Badge key={f} variant="outline" className="text-xs capitalize">{f}</Badge>
                ))}
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="sm"
                className="ml-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Gerar conteúdo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de fontes — logo abaixo do "chat" de briefing */}
        <CommsContentSourceSelector
          selection={sourceSelection}
          onSelectionChange={setSourceSelection}
          formatosSelecionados={formatosSelecionados}
          onFormatosChange={setFormatosSelecionados}
        />

        {/* Editor — ocupa o espaço principal */}
        {currentResult ? (
          <CommsContentEditor
            generation={currentResult}
            onSaved={(updated) => {
              setCurrentResult(updated);
              fetchHistory();
            }}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                Escreva o briefing acima, marque as fontes e toque em "Gerar conteúdo".
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botão flutuante de gerar, fixo embaixo no mobile (atalho rápido em trânsito) */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-background/95 backdrop-blur border-t p-3 z-20">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full h-11"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1.5" />
          )}
          Gerar conteúdo
        </Button>
      </div>
    </div>
  );
}
