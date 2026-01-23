
# Gerador de Apresentações Interativas (Estilo Gamma)

## Resumo

Adicionar um botão "Gerar Apresentação" no chat do Analista de Pesquisas Eleitorais que transforma a análise em uma Landing Page navegável e interativa. A apresentação pode ser visualizada, salva no histórico da conversa, ou deletada para liberar espaço.

## Estrutura Visual Proposta

```text
+------------------------------------------------------------------+
|  CHAT DE ANÁLISE                                                  |
|------------------------------------------------------------------|
|  [Mensagens de análise com gráficos]                             |
|                                                                   |
|  Assistente: Aqui está a análise detalhada...                    |
|  [Gráfico de Intenção de Voto]                                   |
|  [Gráfico de Rejeição]                                           |
|                                                                   |
|  +----------------------------------------------------+          |
|  | [🎨 Gerar Apresentação]  [📋 Copiar Análise]       |          |
|  +----------------------------------------------------+          |
+------------------------------------------------------------------+

                           ↓ Clique em "Gerar Apresentação"

+------------------------------------------------------------------+
|  [←]  Apresentação: Análise Eleitoral Jan/26        [🗑️] [X]    |
+------------------------------------------------------------------+
| [1] [2] [3] [4] [5] [6]  ← Navegação por slides                  |
+------------------------------------------------------------------+
|                                                                   |
|  ╔════════════════════════════════════════════════════════════╗  |
|  ║                                                            ║  |
|  ║     SLIDE 1: Título Principal                              ║  |
|  ║                                                            ║  |
|  ║     📊 Análise de Pesquisas Eleitorais                     ║  |
|  ║         Paraná - Janeiro 2026                              ║  |
|  ║                                                            ║  |
|  ║     Instituto: Paraná Pesquisas                            ║  |
|  ║     Período: 15-20 Janeiro 2026                            ║  |
|  ║                                                            ║  |
|  ╚════════════════════════════════════════════════════════════╝  |
|                                                                   |
|              [← Anterior]    1/6    [Próximo →]                  |
+------------------------------------------------------------------+
```

## Fluxo de Uso

1. **Após análise completa**: Botão "Gerar Apresentação" aparece abaixo da última resposta da IA
2. **Processamento**: IA processa o conteúdo da conversa e gera estrutura de slides
3. **Visualização**: Modal fullscreen com navegação por slides animados
4. **Persistência**: Apresentação salva automaticamente vinculada à conversa
5. **Gerenciamento**: Pode ser deletada a qualquer momento para liberar espaço

## Estrutura de Slides Gerados

| Slide | Conteúdo |
|-------|----------|
| 1. Capa | Título, período, institutos utilizados |
| 2. Contexto | Resumo executivo da análise |
| 3-N. Dados | Gráficos e insights principais (1 por slide) |
| N+1. Conclusões | Principais descobertas estratégicas |
| N+2. Recomendações | Próximos passos sugeridos |

## Detalhes Técnicos

### 1. Alteração no Banco de Dados

Adicionar coluna `presentation` na tabela `ai_chat_conversations`:

```sql
ALTER TABLE public.ai_chat_conversations
ADD COLUMN presentation JSONB DEFAULT NULL;

COMMENT ON COLUMN public.ai_chat_conversations.presentation IS 
  'Estrutura da apresentação gerada: {slides: [{type, title, content, chart?, notes?}], generated_at, status}';
```

### 2. Estrutura de Dados da Apresentação

```typescript
interface Slide {
  id: string;
  type: 'cover' | 'content' | 'chart' | 'conclusion' | 'recommendations';
  title: string;
  subtitle?: string;
  content?: string; // Markdown
  chart?: ChartData; // Gráfico do ResearchChartRenderer
  bullets?: string[];
  notes?: string; // Notas do apresentador
  background?: 'gradient' | 'dark' | 'light';
}

interface Presentation {
  slides: Slide[];
  generated_at: string;
  title: string;
  theme: 'default' | 'corporate' | 'modern';
}
```

### 3. Componentes a Criar

| Componente | Descrição |
|------------|-----------|
| `PresentationViewer.tsx` | Modal fullscreen com navegação por slides |
| `SlideRenderer.tsx` | Renderiza cada tipo de slide com animações |
| `SlideNavigation.tsx` | Barra de navegação com miniaturas |
| `GeneratePresentationButton.tsx` | Botão que dispara a geração |

### 4. Lógica de Geração

A IA analisará o conteúdo da conversa e gerará a estrutura de slides:

```typescript
// No ResearchAnalystChat.tsx
const handleGeneratePresentation = async () => {
  setGeneratingPresentation(true);
  
  // Envia mensagem especial para gerar apresentação
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    body: JSON.stringify({
      agent_id: agent.id,
      messages: [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { 
          role: 'user', 
          content: '[[GENERATE_PRESENTATION]] Gere uma apresentação executiva em formato JSON com slides baseados na análise acima.' 
        }
      ],
      selected_pesquisa_ids: selectedPesquisaIds,
    }),
  });
  
  // Parse da resposta JSON com estrutura de slides
  // Salva na conversa atual
};
```

### 5. Novo Componente: PresentationViewer

```text
Props:
- presentation: Presentation
- onClose: () => void
- onDelete: () => void

Features:
- Navegação por teclado (←/→, Esc para fechar)
- Transições animadas com Framer Motion
- Suporte a gráficos interativos (recharts)
- Modo apresentação fullscreen
- Indicador de progresso
```

### 6. Modificações Necessárias

| Arquivo | Alteração |
|---------|-----------|
| `useConversations.ts` | Adicionar suporte a `presentation` field |
| `ResearchAnalystChat.tsx` | Adicionar botão e lógica de geração |
| `ConversationSidebar.tsx` | Indicador visual de conversas com apresentação |
| Edge Function `ai-hub-chat` | Detectar comando de geração e formatar resposta |

### 7. Indicador na Sidebar

Conversas com apresentação terão ícone diferenciado:

```text
CONVERSAS
----------
[+] Nova
----------
> Análise Jan 23  📊  ← Ícone indica apresentação salva
  [✏️][🗑️]
----------
> Comparativo...
  [✏️][🗑️]
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Adicionar coluna `presentation` |
| `src/components/ai-hub/PresentationViewer.tsx` | Criar | Visualizador de apresentação fullscreen |
| `src/components/ai-hub/slides/SlideRenderer.tsx` | Criar | Renderizador de slides individuais |
| `src/components/ai-hub/slides/CoverSlide.tsx` | Criar | Slide de capa |
| `src/components/ai-hub/slides/ContentSlide.tsx` | Criar | Slide de conteúdo com markdown |
| `src/components/ai-hub/slides/ChartSlide.tsx` | Criar | Slide com gráfico interativo |
| `src/components/ai-hub/slides/SlideNavigation.tsx` | Criar | Barra de navegação inferior |
| `src/hooks/useConversations.ts` | Modificar | Suportar campo `presentation` |
| `src/components/ai-hub/ResearchAnalystChat.tsx` | Modificar | Adicionar botão e integração |
| `src/components/ai-hub/ConversationSidebar.tsx` | Modificar | Indicador de apresentação |
| `supabase/functions/ai-hub-chat/index.ts` | Modificar | Detectar e processar geração |

## Considerações de UX

- Indicador de loading durante geração (pode levar alguns segundos)
- Navegação intuitiva com setas ou clique
- Animações suaves entre slides (Framer Motion)
- Responsivo para diferentes tamanhos de tela
- Opção de deletar apenas a apresentação (mantém conversa)
- Atalhos de teclado para navegação

## Estimativa de Tamanho

A apresentação em JSON é leve (tipicamente 10-50KB), ocupando espaço mínimo no banco. O limite de tamanho de JSONB no PostgreSQL (255 MB) permite milhares de apresentações sem problemas.

