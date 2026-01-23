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
  // Multiple regex patterns to handle various AI output formats
  const patterns = [
    /<!--CHART_DATA\n?([\s\S]*?)\n?CHART_DATA-->/,          // Standard format
    /<!--\s*CHART_DATA\s*\n?([\s\S]*?)\n?CHART_DATA\s*-->/,  // With spaces
    /<!\-\-CHART_DATA\n?([\s\S]*?)\n?CHART_DATA\-\->/,       // Escaped dashes
    /CHART_DATA[\s\S]*?(\{[\s\S]*?"charts"[\s\S]*?\})[\s\S]*?CHART_DATA/,  // Partial format
    /<!--CHART_DATA([\s\S]*?)CHART_DATA→/,                   // Arrow format
  ];
  
  for (const pattern of patterns) {
    const chartMatch = content.match(pattern);
    if (chartMatch) {
      try {
        let jsonStr = chartMatch[1].trim();
        
        // Try to find a valid JSON object if the match is messy
        if (!jsonStr.startsWith('{')) {
          const jsonStart = jsonStr.indexOf('{');
          if (jsonStart !== -1) {
            jsonStr = jsonStr.substring(jsonStart);
          }
        }
        
        // Find matching closing brace
        let braceCount = 0;
        let jsonEnd = 0;
        for (let i = 0; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') braceCount++;
          if (jsonStr[i] === '}') braceCount--;
          if (braceCount === 0 && jsonStr[i] === '}') {
            jsonEnd = i + 1;
            break;
          }
        }
        if (jsonEnd > 0) {
          jsonStr = jsonStr.substring(0, jsonEnd);
        }
        
        const chartJson = JSON.parse(jsonStr);
        
        // Clean all variations from content
        let text = content
          .replace(/<!--\s*CHART_DATA[\s\S]*?CHART_DATA\s*-->/g, '')
          .replace(/<!--CHART_DATA[\s\S]*?CHART_DATA→/g, '')
          .replace(/CHART_DATA[\s\S]*?CHART_DATA/g, '')
          .trim();
        
        return { 
          text, 
          charts: Array.isArray(chartJson.charts) ? chartJson.charts : [] 
        };
      } catch (e) {
        console.warn('Failed to parse chart data with pattern:', pattern, e);
        continue;
      }
    }
  }
  
  // Fallback: try to find and remove any visible CHART_DATA remnants
  const cleanedText = content
    .replace(/<!--\s*CHART_DATA[\s\S]*$/g, '')  // Incomplete at end
    .replace(/CHART_DATA[\s\S]*$/g, '')         // Partial at end
    .trim();
  
  return { text: cleanedText, charts: [] };
};
