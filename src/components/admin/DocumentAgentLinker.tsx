import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Bot, Plus, X, Loader2 } from 'lucide-react';

interface AgentOption {
  id: string;
  name: string;
  agent_type: string;
}

interface DocumentAgentLinkerProps {
  documentId: string;
  /** Called after a link change so the parent can refresh scope/badges. */
  onChanged?: () => void;
}

export function DocumentAgentLinker({ documentId, onChanged }: DocumentAgentLinkerProps) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [agentsRes, linksRes] = await Promise.all([
      supabase
        .from('ai_agent_config')
        .select('id, name, agent_type')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('ai_agent_documents')
        .select('agent_id')
        .eq('document_id', documentId),
    ]);
    if (agentsRes.data) setAgents(agentsRes.data);
    if (linksRes.data) {
      setLinkedIds(new Set(linksRes.data.map((r: { agent_id: string }) => r.agent_id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const toggle = async (agentId: string, checked: boolean) => {
    if (checked) {
      const { error } = await supabase
        .from('ai_agent_documents')
        .insert({ agent_id: agentId, document_id: documentId });
      if (error) {
        toast({ title: 'Erro ao vincular agente', variant: 'destructive' });
        return;
      }
      // Quando vinculado a um agente, o documento passa a ser específico do agente.
      await supabase
        .from('ai_documents')
        .update({ scope: 'agent_specific' })
        .eq('id', documentId);
      setLinkedIds(prev => new Set(prev).add(agentId));
    } else {
      const { error } = await supabase
        .from('ai_agent_documents')
        .delete()
        .eq('agent_id', agentId)
        .eq('document_id', documentId);
      if (error) {
        toast({ title: 'Erro ao desvincular agente', variant: 'destructive' });
        return;
      }
      const next = new Set(linkedIds);
      next.delete(agentId);
      setLinkedIds(next);
      // Se não há mais nenhum agente vinculado, volta para escopo global.
      if (next.size === 0) {
        await supabase
          .from('ai_documents')
          .update({ scope: 'global' })
          .eq('id', documentId);
      }
    }
    onChanged?.();
  };

  const linkedAgents = agents.filter(a => linkedIds.has(a.id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      <Bot className="w-3 h-3 text-muted-foreground" />
      {linkedAgents.length === 0 ? (
        <span className="text-[10px] text-muted-foreground">Nenhum agente vinculado</span>
      ) : (
        linkedAgents.map(a => (
          <Badge key={a.id} variant="secondary" className="text-[10px] py-0 gap-1">
            {a.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(a.id, false); }}
              className="hover:text-destructive"
              aria-label={`Desvincular ${a.name}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]">
            <Plus className="w-3 h-3 mr-0.5" /> vincular
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="text-xs font-medium mb-2 px-1">Vincular a agentes/ferramentas</div>
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-2">Nenhum agente cadastrado.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {agents.map(a => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={linkedIds.has(a.id)}
                    onCheckedChange={(v) => toggle(a.id, !!v)}
                  />
                  <span className="truncate flex-1">{a.name}</span>
                  <Badge variant="outline" className="text-[9px] py-0">{a.agent_type}</Badge>
                </label>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DocumentAgentLinker;