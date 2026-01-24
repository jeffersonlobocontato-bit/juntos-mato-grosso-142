import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronLeft, BarChart3, Share2, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Presentation } from './slides/types';
import { AnimatedSlideRenderer } from './slides/SlideRenderer';
import { SlideNavigation } from './slides/SlideNavigation';

interface PresentationViewerProps {
  presentation: Presentation;
  onClose: () => void;
  onDelete: () => void;
  conversationId?: string;
}

// Generate a short unique ID for public sharing
const generatePublicId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const PresentationViewer = ({ 
  presentation, 
  onClose, 
  onDelete,
  conversationId
}: PresentationViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Check if already shared
  useEffect(() => {
    const checkExistingShare = async () => {
      if (!conversationId) return;
      
      const { data } = await supabase
        .from('shared_presentations')
        .select('public_id')
        .eq('conversation_id', conversationId)
        .maybeSingle();
      
      if (data?.public_id) {
        setShareUrl(`${window.location.origin}/apresentacao/${data.public_id}`);
      }
    };
    
    checkExistingShare();
  }, [conversationId]);

  const handleShare = async () => {
    if (!conversationId) {
      toast({
        title: "Erro",
        description: "Salve a conversa antes de compartilhar",
        variant: "destructive"
      });
      return;
    }

    setIsSharing(true);

    try {
      // Check if already shared
      const { data: existing } = await supabase
        .from('shared_presentations')
        .select('public_id')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (existing?.public_id) {
        const url = `${window.location.origin}/apresentacao/${existing.public_id}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Link copiado!",
          description: "O link público já existia e foi copiado para a área de transferência"
        });
        return;
      }

      // Create new shared presentation
      const publicId = generatePublicId();
      
      // Use raw insert to bypass strict typing
      const insertData = {
        public_id: publicId,
        conversation_id: conversationId,
        presentation_data: presentation,
        title: presentation.title,
      };
      
      const { error } = await supabase
        .from('shared_presentations')
        .insert(insertData as never);

      if (error) throw error;

      const url = `${window.location.origin}/apresentacao/${publicId}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: "Link criado e copiado!",
        description: "Qualquer pessoa com o link pode ver esta apresentação"
      });
    } catch (error) {
      console.error('Error sharing presentation:', error);
      toast({
        title: "Erro ao compartilhar",
        description: "Não foi possível criar o link público",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência"
      });
    }
  };

  const navigate = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= presentation.slides.length) return;
    
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  }, [currentIndex, presentation.slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          navigate(currentIndex - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          navigate(currentIndex + 1);
          break;
        case 'Escape':
          onClose();
          break;
        case 'Home':
          navigate(0);
          break;
        case 'End':
          navigate(presentation.slides.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, navigate, onClose, presentation.slides.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background"
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground line-clamp-1">
                {presentation.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Apresentação • {presentation.slides.length} slides
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Share Button */}
          {conversationId && (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Compartilhar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Compartilhar apresentação</h4>
                    <p className="text-xs text-muted-foreground">
                      Qualquer pessoa com o link pode ver esta apresentação.
                    </p>
                  </div>
                  
                  {shareUrl ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input 
                          value={shareUrl} 
                          readOnly 
                          className="text-xs h-9"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={copyToClipboard}
                          className="shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full gap-2"
                        onClick={() => window.open(shareUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir em nova aba
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleShare} 
                      disabled={isSharing}
                      className="w-full gap-2"
                    >
                      {isSharing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando link...
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" />
                          Criar link público
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir apresentação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A apresentação será permanentemente excluída, mas a conversa será mantida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Slides Area */}
      <div className="absolute inset-0 pt-20 pb-24 overflow-hidden">
        <AnimatedSlideRenderer 
          slides={presentation.slides} 
          currentIndex={currentIndex} 
          direction={direction} 
        />
      </div>

      {/* Navigation */}
      <div className="absolute bottom-0 left-0 right-0">
        <SlideNavigation
          slides={presentation.slides}
          currentIndex={currentIndex}
          onNavigate={navigate}
        />
      </div>
    </motion.div>
  );
};
