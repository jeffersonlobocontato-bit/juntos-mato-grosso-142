import { ChartData } from '../ResearchChartRenderer';

// Novo tipo para dados de metodologia
export interface MethodologyData {
  label: string;
  value: string;
  description?: string;
}

// Tipo para insight em destaque
export interface HighlightData {
  primary: string;         // Número ou texto principal em destaque
  primaryLabel?: string;   // Label do primário
  secondary?: string;      // Dado secundário
  secondaryLabel?: string; // Label do secundário
  comparison?: {
    from: string;
    to: string;
    label: string;
  };
}

// Tipo para tabela de cruzamento
export interface CrossTableData {
  headers: string[];
  rows: {
    label: string;
    values: (string | number)[];
  }[];
}

// Tipo para barra horizontal (rejeição, ranking)
export interface HorizontalBarData {
  label: string;
  value: number;
  color?: string;
  highlight?: boolean;
}

// Tipo para card de insight numerado
export interface InsightCard {
  number: string;
  title: string;
  description: string;
}

// Tipo para alerta/destaque especial
export interface AlertData {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

export interface Slide {
  id: string;
  type: 
    | 'cover' 
    | 'content' 
    | 'chart' 
    | 'conclusion' 
    | 'recommendations'
    // Novos tipos baseados no modelo de referência
    | 'methodology'       // Ficha técnica com cards de métricas
    | 'highlight'         // Dado em destaque grande
    | 'comparison'        // Comparação antes/depois dramática
    | 'crosstable'        // Tabela de cruzamento por segmento
    | 'horizontal_bars'   // Barras horizontais (rejeição, ranking)
    | 'scenarios'         // Comparação de cenários
    | 'numbered_insights' // Lista de insights numerados
    | 'quote'             // Citação em destaque
    | 'alert';            // Slide de alerta/atenção
  
  title: string;
  subtitle?: string;
  content?: string;
  chart?: ChartData;
  bullets?: string[];
  notes?: string;
  background?: 'gradient' | 'dark' | 'light';
  
  // Novos campos para tipos especializados
  methodology?: MethodologyData[];
  highlight?: HighlightData;
  crossTable?: CrossTableData;
  horizontalBars?: HorizontalBarData[];
  insights?: InsightCard[];
  alert?: AlertData;
  quote?: {
    text: string;
    author?: string;
  };
}

export interface Presentation {
  slides: Slide[];
  generated_at: string;
  title: string;
  theme: 'default' | 'corporate' | 'modern' | 'dark';
}