import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Pencil, 
  Trash2, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  Presentation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
} from "@/components/ui/alert-dialog";
import { Conversation } from '@/hooks/useConversations';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const formatConversationDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  if (isThisWeek(date)) return format(date, 'EEEE', { locale: ptBR });
  if (isThisMonth(date)) return format(date, 'd MMM', { locale: ptBR });
  
  return format(date, 'dd/MM/yy', { locale: ptBR });
};

export const ConversationSidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isLoading,
  isCollapsed,
  onToggleCollapse,
}: ConversationSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border bg-muted/30 flex flex-col items-center py-3 gap-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expandir conversas</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewConversation}
                className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Nova Conversa</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Conversas</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewConversation}
            className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm px-4">
              Nenhuma conversa salva ainda. Inicie uma nova conversa!
            </div>
          ) : (
            <AnimatePresence>
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`group relative rounded-lg transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  {editingId === conv.id ? (
                    <div className="p-2 flex items-center gap-1">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveEdit}
                        className="h-7 w-7 text-emerald-500 hover:text-emerald-600"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEdit}
                        className="h-7 w-7"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className="w-full text-left p-2 flex items-start gap-2"
                    >
                      <MessageSquare className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        activeConversationId === conv.id ? 'text-emerald-500' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <TooltipProvider delayDuration={500}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm font-medium truncate flex-1">
                                  {conv.title}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                {conv.title}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {conv.presentation && (
                            <Presentation className="h-3 w-3 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatConversationDate(conv.updated_at)}
                        </p>
                      </div>

                      {/* Action buttons - visible on hover */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(conv);
                          }}
                          className="h-6 w-6"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              className="h-6 w-6 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A conversa "{conv.title}" será permanentemente excluída.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteConversation(conv.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
