import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Slide } from './types';

interface CoverSlideProps {
  slide: Slide;
}

export const CoverSlide = ({ slide }: CoverSlideProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-primary/30 via-background to-emerald-500/20 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-emerald-500/70 flex items-center justify-center mb-8 shadow-2xl relative z-10"
      >
        <BarChart3 className="w-14 h-14 text-primary-foreground" />
      </motion.div>
      
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-4 max-w-4xl relative z-10"
      >
        {slide.title}
      </motion.h1>
      
      {slide.subtitle && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl relative z-10"
        >
          {slide.subtitle}
        </motion.p>
      )}
      
      {slide.content && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 flex flex-wrap gap-4 justify-center relative z-10"
        >
          {slide.content.split('\n').filter(Boolean).map((line, idx) => (
            <span
              key={idx}
              className="px-4 py-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full text-sm text-foreground border border-primary/20 shadow-sm"
            >
              {line}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
};
