import { BarChart3 } from 'lucide-react';
import { DynamicPieChart } from './charts/DynamicPieChart';
import { DynamicLineChart } from './charts/DynamicLineChart';
import { DynamicBarChart } from './charts/DynamicBarChart';
import { DynamicComparisonChart } from './charts/DynamicComparisonChart';

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

export interface ChartData {
  type: 'pie' | 'line' | 'bar' | 'comparison';
  title: string;
  data?: PieData[] | BarData[];
  series?: Series[];
  keys?: string[];
}

interface ResearchChartRendererProps {
  charts: ChartData[];
}

export const ResearchChartRenderer = ({ charts }: ResearchChartRendererProps) => {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <BarChart3 className="w-4 h-4" />
        <span>Visualizações Geradas</span>
      </div>
      
      <div className={`grid gap-4 ${charts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {charts.map((chart, idx) => (
          <ChartComponent key={idx} chart={chart} />
        ))}
      </div>
    </div>
  );
};

const ChartComponent = ({ chart }: { chart: ChartData }) => {
  switch (chart.type) {
    case 'pie':
      return <DynamicPieChart title={chart.title} data={chart.data as PieData[]} />;
    
    case 'line':
      return <DynamicLineChart title={chart.title} series={chart.series || []} />;
    
    case 'bar':
      return <DynamicBarChart title={chart.title} data={chart.data as BarData[]} keys={chart.keys} />;
    
    case 'comparison':
      return <DynamicComparisonChart title={chart.title} series={chart.series || []} />;
    
    default:
      console.warn('Unknown chart type:', chart.type);
      return null;
  }
};

// Utility function to parse chart data from AI response
export const parseChartDataFromMessage = (content: string): { text: string; charts: ChartData[] } => {
  const chartMatch = content.match(/<!--CHART_DATA\n?([\s\S]*?)\n?CHART_DATA-->/);
  
  if (chartMatch) {
    try {
      const chartJson = JSON.parse(chartMatch[1].trim());
      const text = content.replace(/<!--CHART_DATA[\s\S]*?CHART_DATA-->/, '').trim();
      return { 
        text, 
        charts: Array.isArray(chartJson.charts) ? chartJson.charts : [] 
      };
    } catch (e) {
      console.warn('Failed to parse chart data:', e);
      return { text: content, charts: [] };
    }
  }
  
  return { text: content, charts: [] };
};
