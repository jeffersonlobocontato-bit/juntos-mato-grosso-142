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
    <div className="bg-background/80 backdrop-blur-sm border-t border-border p-4">
      <div className="flex items-center justify-center gap-4">
        {/* Previous button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoBack}
          className="h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Slide indicators */}
        <div className="flex items-center gap-2">
          {slides.map((slide, idx) => (
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
          ))}
        </div>

        {/* Page indicator */}
        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          {currentIndex + 1} / {slides.length}
        </span>

        {/* Next button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canGoForward}
          className="h-10 w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
