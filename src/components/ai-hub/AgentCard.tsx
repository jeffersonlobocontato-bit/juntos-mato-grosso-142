import { Bot, MessageSquare, Edit2, Trash2, Power, PowerOff, Target, Users, Megaphone, Vote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  agent_type: string;
  is_active: boolean;
  avatar_url: string | null;
  conversation_starters: string[];
  target_audience: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface AgentCardProps {
  agent: AIAgent;
  canManage: boolean;
  onEdit: () => void;
  onChat: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
}

const AUDIENCE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  marketing: { label: 'Marketing', icon: Megaphone, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  politico: { label: 'Político', icon: Users, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  eleitoral: { label: 'Eleitoral', icon: Vote, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  geral: { label: 'Geral', icon: Target, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export const AgentCard = ({
  agent,
  canManage,
  onEdit,
  onChat,
  onDelete,
  onToggleActive,
}: AgentCardProps) => {
  const audience = agent.target_audience || 'geral';
  const audienceConfig = AUDIENCE_CONFIG[audience] || AUDIENCE_CONFIG.geral;
  const AudienceIcon = audienceConfig.icon;

  return (
    <Card className={`group transition-all duration-300 hover:shadow-lg ${!agent.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              {agent.avatar_url ? (
                <img 
                  src={agent.avatar_url} 
                  alt={agent.name} 
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <Bot className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">{agent.name}</h3>
              <Badge variant="outline" className={`text-xs ${audienceConfig.color}`}>
                <AudienceIcon className="w-3 h-3 mr-1" />
                {audienceConfig.label}
              </Badge>
            </div>
          </div>
          
          {canManage && (
            <div className="flex items-center gap-1">
              <Switch
                checked={agent.is_active}
                onCheckedChange={onToggleActive}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
          {agent.description || 'Sem descrição'}
        </p>

        {/* Conversation Starters Preview */}
        {Array.isArray(agent.conversation_starters) && agent.conversation_starters.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Sugestões de conversa:</p>
            <div className="flex flex-wrap gap-1">
              {agent.conversation_starters.slice(0, 2).map((starter, idx) => (
                <span 
                  key={idx}
                  className="text-xs px-2 py-1 bg-muted rounded-full line-clamp-1 max-w-[120px]"
                >
                  {starter}
                </span>
              ))}
              {agent.conversation_starters.length > 2 && (
                <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                  +{agent.conversation_starters.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 mb-4">
          {agent.is_active ? (
            <div className="flex items-center gap-1 text-xs text-green-500">
              <Power className="w-3 h-3" />
              Ativo
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <PowerOff className="w-3 h-3" />
              Inativo
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={onChat} 
            className="flex-1 gap-2"
            disabled={!agent.is_active}
          >
            <MessageSquare className="w-4 h-4" />
            Conversar
          </Button>
          
          {canManage && (
            <>
              <Button variant="outline" size="icon" onClick={onEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o agente "{agent.name}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
