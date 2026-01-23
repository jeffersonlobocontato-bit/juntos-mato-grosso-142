import { motion } from 'framer-motion';
import { Slide } from './types';
import { Quote } from 'lucide-react';

interface QuoteSlideProps {
  slide: Slide;
}

export const QuoteSlide = ({ slide }: QuoteSlideProps) => {
  const quote = slide.quote;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 md:p-16 bg-gradient-to-br from-muted/50 via-background to-muted/30">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
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
        className="text-2xl md:text-4xl font-medium text-foreground text-center max-w-4xl leading-relaxed"
      >
        "{quote?.text || slide.content}"
      </motion.blockquote>

      {quote?.author && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-8 text-lg text-primary font-medium"
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
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute bottom-8 right-8 rotate-180"
      >
        <Quote className="w-24 h-24 text-primary" />
      </motion.div>
    </div>
  );
};