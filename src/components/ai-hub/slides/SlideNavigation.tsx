import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slide } from './types';

interface SlideNavigationProps {
  slides: Slide[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export const SlideNavigation = ({ slides, currentIndex, onNavigate }: SlideNavigationProps) => {
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < slides.length - 1;

  return (
    <div className="bg-background/95 backdrop-blur-md border-t border-border p-3 sm:p-4 safe-area-inset-bottom">
      <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 max-w-md mx-auto">
        {/* Previous button - larger on mobile */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack}
          className="h-12 w-12 sm:h-10 sm:w-10 shrink-0 touch-manipulation"
        >
          <ChevronLeft className="h-6 w-6 sm:h-5 sm:w-5" />
        </Button>

        {/* Slide indicators - hidden on very small screens, show page number instead */}
        <div className="flex-1 flex items-center justify-center">
          {/* Mobile: just show page numbers */}
          <span className="sm:hidden text-base font-medium text-foreground">
            {currentIndex + 1} / {slides.length}
          </span>
          
          {/* Desktop: show dots */}
          <div className="hidden sm:flex items-center gap-2">
            {slides.length <= 12 ? (
              slides.map((slide, idx) => (
                <motion.button
                  key={slide.id}
                  onClick={() => onNavigate(idx)}
                  className={`relative h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-8 bg-primary' 
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  title={slide.title}
                />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {slides.length}
              </span>
            )}
          </div>
        </div>

        {/* Next button - larger on mobile */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canGoForward}
          className="h-12 w-12 sm:h-10 sm:w-10 shrink-0 touch-manipulation"
        >
          <ChevronRight className="h-6 w-6 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};
