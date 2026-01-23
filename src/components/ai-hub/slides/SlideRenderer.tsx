import { AnimatePresence, motion } from 'framer-motion';
import { Slide } from './types';
import { CoverSlide } from './CoverSlide';
import { ContentSlide } from './ContentSlide';
import { ChartSlide } from './ChartSlide';

interface SlideRendererProps {
  slide: Slide;
  direction: number;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export const SlideRenderer = ({ slide, direction }: SlideRendererProps) => {
  const renderSlideContent = () => {
    switch (slide.type) {
      case 'cover':
        return <CoverSlide slide={slide} />;
      
      case 'chart':
        return <ChartSlide slide={slide} />;
      
      case 'content':
      case 'conclusion':
      case 'recommendations':
      default:
        return <ContentSlide slide={slide} />;
    }
  };

  return (
    <motion.div
      key={slide.id}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
      className="absolute inset-0 bg-background"
    >
      {renderSlideContent()}
    </motion.div>
  );
};

export const AnimatedSlideRenderer = ({ 
  slides, 
  currentIndex, 
  direction 
}: { 
  slides: Slide[]; 
  currentIndex: number; 
  direction: number;
}) => {
  const currentSlide = slides[currentIndex];
  
  if (!currentSlide) return null;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <SlideRenderer key={currentSlide.id} slide={currentSlide} direction={direction} />
    </AnimatePresence>
  );
};
