// Cores dos 5 novos eixos temáticos
export const EIXO_COLORS: Record<string, string> = {
  'Desenvolvimento Social': 'hsl(210, 70%, 50%)',           // Azul
  'Desenvolvimento Econômico Sustentável': 'hsl(142, 70%, 40%)', // Verde
  'Desenvolvimento das Cidades e Infraestrutura': 'hsl(38, 90%, 50%)', // Amarelo/Laranja
  'Gestão Pública Eficiente': 'hsl(280, 60%, 50%)',         // Roxo
  'Segurança, Justiça, Combate à Corrupção': 'hsl(0, 70%, 50%)', // Vermelho
};

// Cores em formato hexadecimal para uso em mapas
export const EIXO_HEX_COLORS: Record<string, string> = {
  'Desenvolvimento Social': '#3B82F6',
  'Desenvolvimento Econômico Sustentável': '#22C55E',
  'Desenvolvimento das Cidades e Infraestrutura': '#F59E0B',
  'Gestão Pública Eficiente': '#8B5CF6',
  'Segurança, Justiça, Combate à Corrupção': '#EF4444',
};

// Cores por ordem do eixo (1-5)
export const EIXO_COLORS_BY_ORDER: string[] = [
  'hsl(210, 70%, 50%)',   // 1 - Desenvolvimento Social
  'hsl(142, 70%, 40%)',   // 2 - Desenvolvimento Econômico
  'hsl(38, 90%, 50%)',    // 3 - Cidades e Infraestrutura
  'hsl(280, 60%, 50%)',   // 4 - Gestão Pública
  'hsl(0, 70%, 50%)',     // 5 - Segurança
];

export const getEixoColor = (eixoNome: string): string => {
  return EIXO_COLORS[eixoNome] || 'hsl(var(--muted-foreground))';
};

export const getEixoHexColor = (eixoNome: string): string => {
  return EIXO_HEX_COLORS[eixoNome] || '#6B7280';
};

export const getEixoColorByOrder = (ordem: number): string => {
  return EIXO_COLORS_BY_ORDER[ordem - 1] || 'hsl(var(--muted-foreground))';
};

// Badge variant baseado no eixo
export const getEixoBadgeClass = (eixoNome: string): string => {
  const colorMap: Record<string, string> = {
    'Desenvolvimento Social': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Desenvolvimento Econômico Sustentável': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Desenvolvimento das Cidades e Infraestrutura': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'Gestão Pública Eficiente': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Segurança, Justiça, Combate à Corrupção': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colorMap[eixoNome] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
};

// Ícones sugeridos para cada eixo (usando Lucide)
export const EIXO_ICONS: Record<string, string> = {
  'Desenvolvimento Social': 'Heart',
  'Desenvolvimento Econômico Sustentável': 'TrendingUp',
  'Desenvolvimento das Cidades e Infraestrutura': 'Building2',
  'Gestão Pública Eficiente': 'FileCheck',
  'Segurança, Justiça, Combate à Corrupção': 'Shield',
};

// Função para formatar código do tema (1.1, 2.3, etc.)
export const formatTemaCodigo = (codigo: string): string => {
  return codigo;
};

// Função para obter nome abreviado do eixo
export const getEixoShortName = (nome: string): string => {
  const shortNames: Record<string, string> = {
    'Desenvolvimento Social': 'Social',
    'Desenvolvimento Econômico Sustentável': 'Econômico',
    'Desenvolvimento das Cidades e Infraestrutura': 'Infraestrutura',
    'Gestão Pública Eficiente': 'Gestão',
    'Segurança, Justiça, Combate à Corrupção': 'Segurança',
  };
  return shortNames[nome] || nome;
};

// Interfaces
export interface Eixo {
  id: string;
  nome: string;
  subtitulo?: string | null;
  ordem: number;
  descricao?: string | null;
}

export interface Tema {
  id: string;
  eixo_id: string;
  nome: string;
  codigo: string;
  ordem: number;
}

export interface Subtema {
  id: string;
  tema_id: string;
  nome: string;
  ordem: number;
}

// Filtrar temas por eixo
export const getTemasByEixo = (eixoId: string, temas: Tema[]): Tema[] => {
  return temas.filter(t => t.eixo_id === eixoId).sort((a, b) => a.ordem - b.ordem);
};

// Filtrar subtemas por tema
export const getSubtemasByTema = (temaId: string, subtemas: Subtema[]): Subtema[] => {
  return subtemas.filter(s => s.tema_id === temaId).sort((a, b) => a.ordem - b.ordem);
};
