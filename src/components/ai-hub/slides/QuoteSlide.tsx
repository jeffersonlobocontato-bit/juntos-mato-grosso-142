import { motion } from 'framer-motion';
import { Slide } from './types';
import { Quote } from 'lucide-react';

interface QuoteSlideProps {
  slide: Slide;
}

export const QuoteSlide = ({ slide }: QuoteSlideProps) => {
  const quote = slide.quote;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 md:p-16 bg-gradient-to-br from-muted/50 via-background to-primary/20 relative overflow-hidden">
      {/* Decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute top-1/3 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />
      
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ duration: 0.5 }}
        className="absolute top-8 left-8"
      >
        <Quote className="w-24 h-24 text-primary" />
      </motion.div>

      {slide.title && slide.title !== quote?.text && (
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-xl md:text-2xl font-medium text-muted-foreground mb-8 text-center"
        >
          {slide.title}
        </motion.h2>
      )}

      <motion.blockquote
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-2xl md:text-4xl font-medium text-foreground text-center max-w-4xl leading-relaxed relative z-10"
      >
        <span className="text-primary text-5xl font-serif leading-none">"</span>
        {quote?.text || slide.content}
        <span className="text-primary text-5xl font-serif leading-none">"</span>
      </motion.blockquote>

      {quote?.author && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-8 text-lg text-primary font-medium bg-primary/10 px-6 py-2 rounded-full"
        >
          — {quote.author}
        </motion.p>
      )}

      {slide.subtitle && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 text-base text-muted-foreground text-center max-w-2xl"
        >
          {slide.subtitle}
        </motion.p>
      )}

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute bottom-8 right-8 rotate-180"
      >
        <Quote className="w-24 h-24 text-primary" />
      </motion.div>
    </div>
  );
};
