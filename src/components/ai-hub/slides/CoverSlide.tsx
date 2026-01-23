import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Slide } from './types';

interface CoverSlideProps {
  slide: Slide;
}

export const CoverSlide = ({ slide }: CoverSlideProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-primary/20 via-background to-primary/10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-8 shadow-xl"
      >
        <BarChart3 className="w-12 h-12 text-primary-foreground" />
      </motion.div>
      
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-4 max-w-4xl"
      >
        {slide.title}
      </motion.h1>
      
      {slide.subtitle && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl"
        >
          {slide.subtitle}
        </motion.p>
      )}
      
      {slide.content && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 flex flex-wrap gap-4 justify-center"
        >
          {slide.content.split('\n').filter(Boolean).map((line, idx) => (
            <span
              key={idx}
              className="px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground"
            >
              {line}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
};
