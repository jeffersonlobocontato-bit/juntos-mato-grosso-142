import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Slide } from './types';

interface NumberedInsightsSlideProps {
  slide: Slide;
}

export const NumberedInsightsSlide = ({ slide }: NumberedInsightsSlideProps) => {
  const insights = slide.insights || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const cardColors = [
    'from-primary/20 to-primary/5 border-primary/30',
    'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    'from-violet-500/20 to-violet-500/5 border-violet-500/30',
    'from-rose-500/20 to-rose-500/5 border-rose-500/30',
  ];

  return (
    <div className="h-full flex flex-col p-8 md:p-12 bg-gradient-to-br from-amber-500/10 via-background to-primary/10">
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-bold text-foreground mb-8"
      >
        {slide.title}
      </motion.h2>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className={`bg-gradient-to-br ${cardColors[idx % cardColors.length]} border rounded-xl p-6 flex flex-col hover:shadow-lg transition-all hover:scale-[1.02]`}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-xl font-bold mb-4 shadow-md">
              {insight.number || String(idx + 1).padStart(2, '0')}
            </div>
            <h3 className="text-lg font-bold text-foreground mb-3">
              {insight.title}
            </h3>
            <div className="text-sm text-muted-foreground leading-relaxed flex-1 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                  p: ({ children }) => <span>{children}</span>,
                }}
              >
                {insight.description}
              </ReactMarkdown>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {slide.quote && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-8 text-center"
        >
          <blockquote className="text-lg italic text-muted-foreground border-l-4 border-primary pl-4 max-w-2xl mx-auto bg-primary/5 py-3 pr-4 rounded-r-lg">
            "{slide.quote.text}"
          </blockquote>
        </motion.div>
      )}

      {slide.content && !slide.quote && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-6 text-center text-muted-foreground"
        >
          {slide.content}
        </motion.p>
      )}
    </div>
  );
};
