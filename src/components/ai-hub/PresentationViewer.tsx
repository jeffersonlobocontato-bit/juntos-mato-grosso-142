import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronLeft, BarChart3 } from 'lucide-react';
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
import { Presentation } from './slides/types';
import { AnimatedSlideRenderer } from './slides/SlideRenderer';
import { SlideNavigation } from './slides/SlideNavigation';

interface PresentationViewerProps {
  presentation: Presentation;
  onClose: () => void;
  onDelete: () => void;
}

export const PresentationViewer = ({ 
  presentation, 
  onClose, 
  onDelete 
}: PresentationViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

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
      <div className="absolute inset-0 pt-16 pb-20 overflow-hidden">
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
