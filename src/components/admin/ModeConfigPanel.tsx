import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  Loader2,
  FileText,
  Lightbulb,
  GitCompareArrows,
  Scale,
  PenTool,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import type { AnalysisMode } from '@/components/admin/AnalysisModeSelector';
import { ModeDocumentLibrary } from '@/components/admin/ModeDocumentLibrary';

type ModeConfig = {
  id: string;
  agent_type: string;
  name: string;
  description: string | null;
  system_prompt: string;
  is_active: boolean;
};

const MODE_META: Record<string, { label: string; icon: React.ElementType; agentType: string }> = {
  plano: { label: 'Plano de Governo', icon: FileText, agentType: 'plano_governo_plano' },
  brainstorm: { label: 'Brainstorming', icon: Lightbulb, agentType: 'plano_governo_brainstorm' },
  cruzamento: { label: 'Cruzamento', icon: GitCompareArrows, agentType: 'plano_governo_cruzamento' },
  balanco: { label: 'Balanço', icon: Scale, agentType: 'plano_governo_balanco' },
  conteudo: { label: 'Conteúdo', icon: PenTool, agentType: 'plano_governo_conteudo' },
  coerencia: { label: 'Coerência', icon: CheckCircle2, agentType: 'plano_governo_coerencia' },
};

const MODES: AnalysisMode[] = ['plano', 'brainstorm', 'cruzamento', 'balanco', 'conteudo', 'coerencia'];

interface ModeConfigPanelProps {
  isAdmin: boolean;
}

export function ModeConfigPanel({ isAdmin }: ModeConfigPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState<Record<string, ModeConfig>>({});
  const [editedConfigs, setEditedConfigs] = useState<Record<string, { name: string; description: string; system_prompt: string }>>({});
  const [savingMode, setSavingMode] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_agent_config')
        .select('*')
        .like('agent_type', 'plano_governo_%')
        .neq('agent_type', 'plano_governo');

      if (error) throw error;

      const configMap: Record<string, ModeConfig> = {};
      const editMap: Record<string, { name: string; description: string; system_prompt: string }> = {};

      (data || []).forEach((config) => {
        const mode = config.agent_type.replace('plano_governo_', '');
        configMap[mode] = config;
        editMap[mode] = {
          name: config.name,
          description: config.description || '',
          system_prompt: config.system_prompt,
        };
      });

      setConfigs(configMap);
      setEditedConfigs(editMap);
    } catch (error) {
      console.error('Error fetching mode configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (mode: string) => {
    const config = configs[mode];
    const edited = editedConfigs[mode];
    if (!config || !edited || !isAdmin) return;

    setSavingMode(mode);
    try {
      const { error } = await supabase
        .from('ai_agent_config')
        .update({
          name: edited.name,
          description: edited.description || null,
          system_prompt: edited.system_prompt,
        })
        .eq('id', config.id);

      if (error) throw error;

      setConfigs(prev => ({
        ...prev,
        [mode]: { ...prev[mode], name: edited.name, description: edited.description, system_prompt: edited.system_prompt },
      }));

      toast({ title: 'Salvo', description: `Configuração do modo "${edited.name}" atualizada.` });
    } catch (error) {
      console.error('Error saving mode config:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar configuração.', variant: 'destructive' });
    } finally {
      setSavingMode(null);
    }
  };

  const handleReset = (mode: string) => {
    const config = configs[mode];
    if (!config) return;
    setEditedConfigs(prev => ({
      ...prev,
      [mode]: {
        name: config.name,
        description: config.description || '',
        system_prompt: config.system_prompt,
      },
    }));
  };

  const hasChanges = (mode: string) => {
    const config = configs[mode];
    const edited = editedConfigs[mode];
    if (!config || !edited) return false;
    return (
      edited.name !== config.name ||
      edited.description !== (config.description || '') ||
      edited.system_prompt !== config.system_prompt
    );
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Configuração por Modo de Análise
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="plano">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 mb-4">
              {MODES.map(mode => {
                const meta = MODE_META[mode];
                const Icon = meta.icon;
                return (
                  <TabsTrigger key={mode} value={mode} className="flex items-center gap-1 text-xs">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{meta.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {MODES.map(mode => {
              const meta = MODE_META[mode];
              const edited = editedConfigs[mode];
              if (!edited) {
                return (
                  <TabsContent key={mode} value={mode}>
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Configuração não encontrada para este modo. Verifique o banco de dados.
                    </p>
                  </TabsContent>
                );
              }

              return (
                <TabsContent key={mode} value={mode} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{meta.agentType}</Badge>
                    {hasChanges(mode) && (
                      <Badge variant="secondary" className="text-xs">Alterações não salvas</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Nome do Modo</Label>
                      <Input
                        value={edited.name}
                        onChange={(e) => setEditedConfigs(prev => ({
                          ...prev,
                          [mode]: { ...prev[mode], name: e.target.value },
                        }))}
                        placeholder="Nome do modo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Descrição</Label>
                      <Input
                        value={edited.description}
                        onChange={(e) => setEditedConfigs(prev => ({
                          ...prev,
                          [mode]: { ...prev[mode], description: e.target.value },
                        }))}
                        placeholder="Descrição curta"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Instruções do Sistema (System Prompt)</Label>
                    <Textarea
                      value={edited.system_prompt}
                      onChange={(e) => setEditedConfigs(prev => ({
                        ...prev,
                        [mode]: { ...prev[mode], system_prompt: e.target.value },
                      }))}
                      placeholder="Instruções personalizadas para este modo..."
                      className="min-h-[200px] text-sm font-mono"
                    />
                  </div>

                  {configs[mode] && (
                    <ModeDocumentLibrary
                      agentConfigId={configs[mode].id}
                      modeName={meta.label}
                    />
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReset(mode)}
                      disabled={!hasChanges(mode)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Desfazer
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(mode)}
                      disabled={!hasChanges(mode) || savingMode === mode}
                    >
                      {savingMode === mode ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default ModeConfigPanel;
