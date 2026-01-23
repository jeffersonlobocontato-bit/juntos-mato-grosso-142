import { ChartData } from '../ResearchChartRenderer';

export interface Slide {
  id: string;
  type: 'cover' | 'content' | 'chart' | 'conclusion' | 'recommendations';
  title: string;
  subtitle?: string;
  content?: string;
  chart?: ChartData;
  bullets?: string[];
  notes?: string;
  background?: 'gradient' | 'dark' | 'light';
}

export interface Presentation {
  slides: Slide[];
  generated_at: string;
  title: string;
  theme: 'default' | 'corporate' | 'modern';
}
