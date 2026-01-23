import { motion } from 'framer-motion';
import { Slide } from './types';

interface HorizontalBarsSlideProps {
  slide: Slide;
}

export const HorizontalBarsSlide = ({ slide }: HorizontalBarsSlideProps) => {
  const bars = slide.horizontalBars || [];
  const maxValue = Math.max(...bars.map(b => b.value), 1);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const barVariants = {
    hidden: { width: 0, opacity: 0 },
    visible: { width: '100%', opacity: 1 }
  };

  return (
    <div className="h-full flex flex-col p-8 md:p-12">
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-bold text-foreground mb-2"
      >
        {slide.title}
      </motion.h2>
      
      {slide.subtitle && (
        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-lg text-muted-foreground mb-8"
        >
          {slide.subtitle}
        </motion.p>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col justify-center gap-4"
      >
        {bars.map((bar, idx) => {
          const percentage = (bar.value / maxValue) * 100;
          const isHighlighted = bar.highlight || idx === 0;
          
          return (
            <motion.div
              key={idx}
              variants={barVariants}
              className="flex items-center gap-4"
            >
              <span className={`w-40 md:w-48 text-sm font-medium truncate ${
                isHighlighted ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {bar.label}
              </span>
              
              <div className="flex-1 h-10 bg-muted/30 rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-lg ${
                    bar.color 
                      ? '' 
                      : isHighlighted 
                        ? 'bg-primary' 
                        : 'bg-primary/50'
                  }`}
                  style={bar.color ? { backgroundColor: bar.color } : undefined}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${
                  percentage > 50 ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                  {bar.value}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {slide.content && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
        >
          <p className="text-sm font-medium text-destructive">
            Maior Rejeição: {slide.content}
          </p>
        </motion.div>
      )}
    </div>
  );
};