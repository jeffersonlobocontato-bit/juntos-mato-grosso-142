/**
 * Registro central dos módulos do painel administrativo.
 * A chave (`key`) é o identificador salvo em `public.user_modules.module_key`.
 */
export interface AdminModuleDef {
  key: string;
  title: string;
  href: string;
}

export const ADMIN_MODULES: AdminModuleDef[] = [
  { key: 'meu-painel', title: 'Meu Painel', href: '/admin/meu-painel' },
  { key: 'dashboard-publico', title: 'Dashboard Público', href: '/dashboard' },
  { key: 'propostas', title: 'Propostas Técnicas', href: '/admin/propostas' },
  { key: 'propostas-politicas', title: 'Propostas Políticas', href: '/admin/propostas-politicas' },
  { key: 'propostas-institucionais', title: 'Propostas Institucionais', href: '/admin/propostas-institucionais' },
  { key: 'sugestoes', title: 'Sugestões Populares', href: '/admin/sugestoes' },
  { key: 'eixos', title: 'Eixos Temáticos', href: '/admin/eixos' },
  { key: 'municipios', title: 'Municípios', href: '/admin/municipios' },
  { key: 'usuarios', title: 'Usuários', href: '/admin/usuarios' },
  { key: 'leads', title: 'Leads', href: '/admin/leads' },
  { key: 'mensageria', title: 'Mensageria', href: '/admin/mensageria' },
  { key: 'plano-governo', title: 'Gerador de Plano', href: '/admin/plano-governo' },
  { key: 'metodologia', title: 'Conteúdo LP Metodologia', href: '/admin/metodologia' },
  { key: 'biblioteca', title: 'Biblioteca de Documentos', href: '/admin/biblioteca' },
  { key: 'gerador-conteudo', title: 'Gerador de Conteúdo', href: '/admin/gerador-conteudo' },
  { key: 'whatsapp', title: 'Integração WhatsApp', href: '/admin/whatsapp' },
  { key: 'analytics', title: 'Analytics LP', href: '/admin/analytics' },
  { key: 'cruzamento-sugestoes', title: 'Painel de Cruzamento', href: '/admin/cruzamento-sugestoes' },
  { key: 'modulo-mkt', title: 'Módulo MKT', href: '/admin/modulo-mkt' },
  { key: 'pesquisas', title: 'Pesquisas Eleitorais', href: '/admin/pesquisas' },
  { key: 'tse', title: 'Histórico Eleitoral', href: '/admin/tse' },
  { key: 'mapa-estrategico', title: 'Mapa Estratégico', href: '/admin/mapa-estrategico' },
  { key: 'cruzamento-wellington', title: 'Cruzamento Wellington', href: '/admin/cruzamento-wellington' },
  { key: 'base-pesquisas', title: 'Base de Pesquisas', href: '/admin/base-pesquisas' },
  { key: 'inteligencia', title: 'Inteligência de Campanha', href: '/admin/inteligencia' },
  { key: 'tracking', title: 'Tracking Eleitoral', href: '/admin/tracking' },
  { key: 'ai-hub', title: 'HUB de IA', href: '/admin/ai-hub' },
  { key: 'cadastro-rapido', title: 'Cadastro Rápido', href: '/admin/cadastro-rapido' },
];

export const MODULE_KEY_BY_HREF: Record<string, string> = Object.fromEntries(
  ADMIN_MODULES.map((m) => [m.href, m.key])
);
