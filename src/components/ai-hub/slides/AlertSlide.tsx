import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
      bg: 'from-amber-500/30 via-amber-500/10 to-orange-500/20',
      icon: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
      border: 'border-amber-500/40',
    },
    info: {
      bg: 'from-blue-500/30 via-blue-500/10 to-cyan-500/20',
      icon: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white',
      border: 'border-blue-500/40',
    },
    success: {
      bg: 'from-green-500/30 via-green-500/10 to-emerald-500/20',
      icon: 'bg-gradient-to-br from-green-500 to-emerald-500 text-white',
      border: 'border-green-500/40',
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
        className={`w-24 h-24 rounded-full ${colors.icon} flex items-center justify-center mb-8 shadow-xl`}
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
          className={`mt-8 p-6 rounded-xl border ${colors.border} bg-background/70 backdrop-blur-sm max-w-2xl shadow-lg`}
        >
          <ul className="space-y-3">
            {slide.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-3 text-foreground">
                <span className="text-primary mt-1 font-bold">•</span>
                <span className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                      p: ({ children }) => <span>{children}</span>,
                    }}
                  >
                    {bullet}
                  </ReactMarkdown>
                </span>
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
