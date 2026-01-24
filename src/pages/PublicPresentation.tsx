import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Presentation } from '@/components/ai-hub/slides/types';
import { AnimatedSlideRenderer } from '@/components/ai-hub/slides/SlideRenderer';
import { SlideNavigation } from '@/components/ai-hub/slides/SlideNavigation';

interface SharedPresentation {
  id: string;
  public_id: string;
  presentation_data: Presentation;
  title: string;
  created_at: string;
  view_count: number;
}

const PublicPresentation = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const fetchPresentation = async () => {
      if (!publicId) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('shared_presentations')
          .select('*')
          .eq('public_id', publicId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Apresentação não encontrada');
          } else {
            throw fetchError;
          }
          return;
        }

        const sharedData = data as unknown as SharedPresentation;
        setPresentation(sharedData.presentation_data);
        setTitle(sharedData.title);

        // Increment view count (fire and forget)
        supabase
          .from('shared_presentations')
          .update({ view_count: (sharedData.view_count || 0) + 1 })
          .eq('id', sharedData.id)
          .then(() => {});

      } catch (err) {
        console.error('Error fetching presentation:', err);
        setError('Erro ao carregar apresentação');
      } finally {
        setLoading(false);
      }
    };

    fetchPresentation();
  }, [publicId]);

  const navigate = useCallback((newIndex: number) => {
    if (!presentation || newIndex < 0 || newIndex >= presentation.slides.length) return;
    
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  }, [currentIndex, presentation]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!presentation) return;
      
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
  }, [currentIndex, navigate, presentation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando apresentação...</p>
        </div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">{error || 'Apresentação não encontrada'}</h1>
          <p className="text-muted-foreground">
            O link pode estar incorreto ou a apresentação foi removida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground line-clamp-1">
              {title || presentation.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Apresentação • {presentation.slides.length} slides
            </p>
          </div>
        </div>
      </header>

      {/* Slides Area */}
      <div className="fixed top-[72px] bottom-[80px] left-0 right-0 overflow-hidden">
        <AnimatedSlideRenderer 
          slides={presentation.slides} 
          currentIndex={currentIndex} 
          direction={direction} 
        />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0">
        <SlideNavigation
          slides={presentation.slides}
          currentIndex={currentIndex}
          onNavigate={navigate}
        />
      </div>
    </motion.div>
  );
};

export default PublicPresentation;
