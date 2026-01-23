import { motion } from 'framer-motion';
import { Slide } from './types';
import { ContentSlide } from './ContentSlide';

interface HorizontalBarsSlideProps {
  slide: Slide;
}

export const HorizontalBarsSlide = ({ slide }: HorizontalBarsSlideProps) => {
  const bars = slide.horizontalBars || [];

  // Fallback: se não houver horizontalBars, usar bullets/content via ContentSlide
  if (bars.length === 0) {
    if (slide.bullets?.length || slide.content) {
      return <ContentSlide slide={slide} />;
    }
    // Fallback visual quando não há dados
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 bg-gradient-to-br from-rose-500/10 via-background to-primary/10">
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-4"
        >
          {slide.title}
        </motion.h2>
        {slide.subtitle && (
          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-lg text-muted-foreground mb-6"
          >
            {slide.subtitle}
          </motion.p>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-center"
        >
          Dados de barras não disponíveis para este slide.
        </motion.p>
      </div>
    );
  }

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

  const barColors = [
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-green-500',
    'from-violet-500 to-purple-500',
    'from-primary to-primary/70',
  ];

  return (
    <div className="h-full flex flex-col p-8 md:p-12 bg-gradient-to-br from-rose-500/10 via-background to-primary/10">
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
                isHighlighted ? 'text-foreground font-bold' : 'text-muted-foreground'
              }`}>
                {bar.label}
              </span>
              
              <div className="flex-1 h-12 bg-muted/30 rounded-xl overflow-hidden relative shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-xl bg-gradient-to-r ${
                    bar.color 
                      ? '' 
                      : isHighlighted 
                        ? barColors[0]
                        : barColors[(idx % (barColors.length - 1)) + 1]
                  } shadow-md`}
                  style={bar.color ? { backgroundColor: bar.color } : undefined}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${
                  percentage > 50 ? 'text-white drop-shadow-md' : 'text-foreground'
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
          className="mt-6 p-4 bg-gradient-to-r from-destructive/20 to-rose-500/10 border border-destructive/30 rounded-lg shadow-md"
        >
          <p className="text-sm font-medium text-destructive">
            🔴 Maior Rejeição: {slide.content}
          </p>
        </motion.div>
      )}
    </div>
  );
};
