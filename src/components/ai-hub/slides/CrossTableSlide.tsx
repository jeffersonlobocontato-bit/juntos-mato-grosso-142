import { motion } from 'framer-motion';
import { Slide } from './types';

interface CrossTableSlideProps {
  slide: Slide;
}

export const CrossTableSlide = ({ slide }: CrossTableSlideProps) => {
  const table = slide.crossTable;

  if (!table) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const rowVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };

  return (
    <div className="h-full flex flex-col p-8 md:p-12 overflow-auto bg-gradient-to-br from-blue-500/10 via-background to-muted/30">
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
        className="flex-1 overflow-auto"
      >
        <table className="w-full border-collapse shadow-md rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="p-4 text-left bg-gradient-to-r from-primary/20 to-primary/10 font-semibold text-foreground border-b border-primary/20">
                Segmento
              </th>
              {table.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="p-4 text-center bg-gradient-to-r from-primary/20 to-primary/10 font-semibold text-foreground border-b border-primary/20 min-w-[100px]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <motion.tr
                key={rowIdx}
                variants={rowVariants}
                className="hover:bg-primary/5 transition-colors"
              >
                <td className="p-4 font-medium text-foreground border-b border-border bg-muted/30">
                  {row.label}
                </td>
                {row.values.map((value, colIdx) => {
                  // Encontrar o maior valor da linha para destacar
                  const numericValues = row.values.filter((v): v is number => typeof v === 'number');
                  const maxValue = Math.max(...numericValues);
                  const isMax = typeof value === 'number' && value === maxValue && numericValues.length > 1;
                  
                  return (
                    <td
                      key={colIdx}
                      className={`p-4 text-center border-b border-border transition-colors ${
                        isMax 
                          ? 'bg-gradient-to-br from-primary/30 to-primary/20 text-primary font-bold shadow-inner' 
                          : 'text-foreground'
                      }`}
                    >
                      {typeof value === 'number' ? `${value}%` : value}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {slide.content && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-lg shadow-md"
        >
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            ⚠️ Ponto de Atenção: {slide.content}
          </p>
        </motion.div>
      )}
    </div>
  );
};
