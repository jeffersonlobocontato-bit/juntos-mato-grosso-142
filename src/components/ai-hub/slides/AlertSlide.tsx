import { motion } from 'framer-motion';
import { Slide } from './types';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface AlertSlideProps {
  slide: Slide;
}

export const AlertSlide = ({ slide }: AlertSlideProps) => {
  const alert = slide.alert;
  const type = alert?.type || 'warning';

  const iconMap = {
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
  };

  const colorMap = {
    warning: {
      bg: 'from-amber-500/20 via-background to-amber-500/10',
      icon: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
    },
    info: {
      bg: 'from-blue-500/20 via-background to-blue-500/10',
      icon: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/30',
    },
    success: {
      bg: 'from-green-500/20 via-background to-green-500/10',
      icon: 'bg-green-500/20 text-green-600 dark:text-green-400',
      border: 'border-green-500/30',
    },
  };

  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <div className={`h-full flex flex-col items-center justify-center p-8 md:p-12 bg-gradient-to-br ${colors.bg}`}>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className={`w-24 h-24 rounded-full ${colors.icon} flex items-center justify-center mb-8`}
      >
        <Icon className="w-12 h-12" />
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-center"
      >
        {slide.title}
      </motion.h2>

      {alert?.title && alert.title !== slide.title && (
        <motion.h3
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-xl md:text-2xl font-semibold text-foreground/80 mb-6 text-center"
        >
          {alert.title}
        </motion.h3>
      )}

      {(alert?.description || slide.subtitle) && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl text-center"
        >
          {alert?.description || slide.subtitle}
        </motion.p>
      )}

      {slide.bullets && slide.bullets.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className={`mt-8 p-6 rounded-xl border ${colors.border} bg-background/50 max-w-2xl`}
        >
          <ul className="space-y-3">
            {slide.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-3 text-foreground">
                <span className="text-primary mt-1">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {slide.content && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-8 text-sm text-muted-foreground text-center max-w-xl"
        >
          {slide.content}
        </motion.p>
      )}
    </div>
  );
};