import { motion } from 'framer-motion';
import { Slide } from './types';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

interface HighlightSlideProps {
  slide: Slide;
}

export const HighlightSlide = ({ slide }: HighlightSlideProps) => {
  const highlight = slide.highlight;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 bg-gradient-to-br from-primary/20 via-background to-amber-500/15">
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center max-w-3xl"
      >
        {slide.title}
      </motion.h2>

      {highlight?.comparison ? (
        // Modo comparação dramática (74,2% → 5,5%)
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center"
          >
            <span className="text-6xl md:text-8xl font-bold text-muted-foreground/50">
              {highlight.comparison.from}
            </span>
            <p className="text-sm text-muted-foreground mt-2">
              {slide.bullets?.[0] || 'Antes'}
            </p>
          </motion.div>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="bg-gradient-to-r from-primary to-amber-500 p-3 rounded-full shadow-lg"
          >
            <ArrowRight className="w-10 h-10 md:w-14 md:h-14 text-white" />
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-center"
          >
            <span className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
              {highlight.comparison.to}
            </span>
            <p className="text-sm text-muted-foreground mt-2">
              {slide.bullets?.[1] || 'Depois'}
            </p>
          </motion.div>
        </div>
      ) : highlight ? (
        // Modo destaque único
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center"
        >
          <span className="text-7xl md:text-9xl font-bold bg-gradient-to-r from-primary via-primary/80 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
            {highlight.primary}
          </span>
          {highlight.primaryLabel && (
            <p className="text-xl md:text-2xl text-muted-foreground mt-4">
              {highlight.primaryLabel}
            </p>
          )}
          
          {highlight.secondary && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-8 flex items-center justify-center gap-2 bg-primary/10 rounded-full px-6 py-3"
            >
              <span className="text-2xl md:text-3xl font-semibold text-foreground">
                {highlight.secondary}
              </span>
              {highlight.secondaryLabel && (
                <span className="text-lg text-muted-foreground">
                  {highlight.secondaryLabel}
                </span>
              )}
            </motion.div>
          )}
        </motion.div>
      ) : null}

      {slide.subtitle && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="text-lg text-muted-foreground mt-8 text-center max-w-2xl"
        >
          {slide.subtitle}
        </motion.p>
      )}

      {slide.content && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-8 px-6 py-4 bg-gradient-to-r from-primary/15 to-amber-500/15 rounded-xl border border-primary/20 shadow-md"
        >
          <p className="text-sm md:text-base text-foreground text-center">
            {slide.content}
          </p>
        </motion.div>
      )}
    </div>
  );
};
