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

  const cardColors = [
    { bg: 'from-emerald-500/20 to-emerald-500/5', icon: 'from-emerald-500 to-green-500', border: 'border-emerald-500/30' },
    { bg: 'from-blue-500/20 to-blue-500/5', icon: 'from-blue-500 to-cyan-500', border: 'border-blue-500/30' },
    { bg: 'from-amber-500/20 to-amber-500/5', icon: 'from-amber-500 to-orange-500', border: 'border-amber-500/30' },
    { bg: 'from-violet-500/20 to-violet-500/5', icon: 'from-violet-500 to-purple-500', border: 'border-violet-500/30' },
    { bg: 'from-rose-500/20 to-rose-500/5', icon: 'from-rose-500 to-pink-500', border: 'border-rose-500/30' },
    { bg: 'from-primary/20 to-primary/5', icon: 'from-primary to-primary/70', border: 'border-primary/30' },
  ];

  return (
    <div className="h-full flex flex-col p-8 md:p-12 bg-gradient-to-br from-emerald-500/10 via-background to-blue-500/10">
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
          const colors = cardColors[idx % cardColors.length];
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-6 flex flex-col items-center text-center shadow-md hover:shadow-lg transition-all hover:scale-[1.02]`}
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colors.icon} flex items-center justify-center mb-4 shadow-md`}>
                <Icon className="w-7 h-7 text-white" />
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
