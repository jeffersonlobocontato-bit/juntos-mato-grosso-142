import { motion } from 'framer-motion';
import { Slide } from './types';
import { DynamicPieChart } from '../charts/DynamicPieChart';
import { DynamicLineChart } from '../charts/DynamicLineChart';
import { DynamicBarChart } from '../charts/DynamicBarChart';
import { DynamicComparisonChart } from '../charts/DynamicComparisonChart';

interface ChartSlideProps {
  slide: Slide;
}

interface PieData {
  name: string;
  value: number;
  color?: string;
}

interface DataPoint {
  date: string;
  value: number;
}

interface Series {
  name: string;
  color?: string;
  data: DataPoint[];
}

type BarData = Record<string, string | number | undefined>;

export const ChartSlide = ({ slide }: ChartSlideProps) => {
  if (!slide.chart) return null;

  const renderChart = () => {
    const { chart } = slide;
    
    switch (chart.type) {
      case 'pie':
        return (
          <div className="w-full max-w-2xl mx-auto">
            <DynamicPieChart title={chart.title} data={chart.data as PieData[]} />
          </div>
        );
      
      case 'line':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <DynamicLineChart title={chart.title} series={chart.series || []} />
          </div>
        );
      
      case 'bar':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <DynamicBarChart title={chart.title} data={chart.data as BarData[]} keys={chart.keys} />
          </div>
        );
      
      case 'comparison':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <DynamicComparisonChart title={chart.title} series={chart.series as Series[] || []} />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col p-8 md:p-12 overflow-auto bg-gradient-to-br from-primary/5 via-background to-emerald-500/10">
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
          className="text-lg text-muted-foreground mb-6"
        >
          {slide.subtitle}
        </motion.p>
      )}

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex-1 flex items-center justify-center bg-card/50 rounded-xl p-4 shadow-inner"
      >
        {renderChart()}
      </motion.div>

      {slide.content && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-6 text-center text-muted-foreground max-w-3xl mx-auto bg-primary/5 rounded-lg p-4"
        >
          {slide.content}
        </motion.p>
      )}
    </div>
  );
};