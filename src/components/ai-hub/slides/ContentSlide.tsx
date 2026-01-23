import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Slide } from './types';

interface ContentSlideProps {
  slide: Slide;
}

export const ContentSlide = ({ slide }: ContentSlideProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };

  return (
    <div className="h-full flex flex-col p-8 md:p-12 overflow-auto">
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-bold text-foreground mb-6 border-b border-border pb-4"
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

      {slide.bullets && slide.bullets.length > 0 ? (
        <motion.ul
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4 flex-1"
        >
          {slide.bullets.map((bullet, idx) => (
            <motion.li
              key={idx}
              variants={itemVariants}
              className="flex items-start gap-4 text-lg"
            >
              <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
                {idx + 1}
              </span>
              <span className="text-foreground pt-1">{bullet}</span>
            </motion.li>
          ))}
        </motion.ul>
      ) : slide.content ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="prose prose-lg dark:prose-invert max-w-none flex-1"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-4 py-2">{children}</td>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-lg leading-relaxed">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-primary">{children}</strong>
              ),
            }}
          >
            {slide.content}
          </ReactMarkdown>
        </motion.div>
      ) : null}
    </div>
  );
};
