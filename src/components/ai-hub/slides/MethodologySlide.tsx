import { motion } from 'framer-motion';
import { Slide } from './types';
import { Users, MapPin, Target, Calendar, FileCheck, BarChart } from 'lucide-react';

interface MethodologySlideProps {
  slide: Slide;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  amostra: Users,
  municipios: MapPin,
  margem: Target,
  confianca: BarChart,
  periodo: Calendar,
  registro: FileCheck,
};

export const MethodologySlide = ({ slide }: MethodologySlideProps) => {
  const items = slide.methodology || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Detectar ícone baseado no label
  const getIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('amostra') || lowerLabel.includes('eleitores')) return Users;
    if (lowerLabel.includes('munic') || lowerLabel.includes('abrang')) return MapPin;
    if (lowerLabel.includes('margem') || lowerLabel.includes('erro')) return Target;
    if (lowerLabel.includes('confian') || lowerLabel.includes('grau')) return BarChart;
    if (lowerLabel.includes('período') || lowerLabel.includes('campo') || lowerLabel.includes('data')) return Calendar;
    if (lowerLabel.includes('registro') || lowerLabel.includes('tse')) return FileCheck;
    return BarChart;
  };

  return (
    <div className="h-full flex flex-col p-8 md:p-12 bg-gradient-to-br from-background via-background to-muted/30">
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
        className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 flex-1 content-center"
      >
        {items.map((item, idx) => {
          const Icon = getIcon(item.label);
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {item.value}
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                {item.label}
              </span>
              {item.description && (
                <span className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {slide.content && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          {slide.content}
        </motion.p>
      )}
    </div>
  );
};