

# Histórico de Conversas para o Analista de Pesquisas Eleitorais

## Resumo

Implementar uma barra lateral no chat do "Analista de Pesquisas Eleitorais" que permite salvar, nomear, editar e continuar conversas anteriores. Isso possibilita que análises estratégicas sejam retomadas a qualquer momento.

## Estrutura Visual Proposta

```text
+--------------------------------------------------+
|  [←]     Analista de Pesquisas Eleitorais    [X] |
+--------------------------------------------------+
|          Seletor de Pesquisas (toolbar)          |
+------------+-------------------------------------+
| CONVERSAS  |                                     |
|------------|                                     |
| [+] Nova   |    Área de Chat Principal           |
|------------|                                     |
| > Análise  |    (mensagens do usuário e IA)      |
|   Jan 23   |                                     |
|   [✏️][🗑️] |                                     |
|------------|                                     |
| > Compara- |                                     |
|   tivo...  |                                     |
|------------|                                     |
| > Intenção |                                     |
|   de voto  |                                     |
+------------+-------------------------------------+
|        [Input de mensagem]              [Enviar] |
+--------------------------------------------------+
```

## Componentes da Solução

### 1. Tabela de Banco de Dados

Criar tabela `ai_chat_conversations` para armazenar as conversas:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| user_id | UUID | Referência ao usuário |
| agent_id | UUID | Referência ao agente de IA |
| title | TEXT | Nome da conversa (editável) |
| messages | JSONB | Array de mensagens {role, content} |
| selected_pesquisa_ids | JSONB | IDs das pesquisas selecionadas |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Última atualização |

### 2. Políticas de Segurança (RLS)

- Usuários só podem ver/editar suas próprias conversas
- Administradores podem ver todas as conversas

### 3. Novo Componente: ConversationSidebar

Barra lateral com:
- Botão "Nova Conversa"
- Lista de conversas anteriores
- Opção de editar nome (clicando no título)
- Botão de excluir conversa
- Indicador de conversa ativa

### 4. Modificações no ResearchAnalystChat

- Adicionar sidebar de conversas à esquerda
- Salvar automaticamente ao receber resposta da IA
- Gerar título automático baseado na primeira mensagem
- Carregar conversa anterior ao clicar na sidebar
- Manter sincronização entre mensagens e banco de dados

## Fluxo de Uso

1. **Iniciar nova conversa**: Usuário clica em "Nova Conversa" ou simplesmente começa a digitar
2. **Auto-salvamento**: Após a primeira resposta da IA, a conversa é salva automaticamente
3. **Título automático**: O sistema gera um título baseado na primeira pergunta do usuário
4. **Editar título**: Usuário clica no título na sidebar para renomear
5. **Continuar conversa**: Clicar em uma conversa carrega todas as mensagens anteriores
6. **Excluir**: Botão de lixeira remove permanentemente a conversa

## Detalhes Técnicos

### Migração SQL

```sql
-- Tabela de conversas de chat com agentes de IA
CREATE TABLE public.ai_chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agent_config(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova Conversa',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_pesquisa_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_ai_chat_conversations_user_id ON public.ai_chat_conversations(user_id);
CREATE INDEX idx_ai_chat_conversations_agent_id ON public.ai_chat_conversations(agent_id);
CREATE INDEX idx_ai_chat_conversations_updated_at ON public.ai_chat_conversations(updated_at DESC);

-- RLS
ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.ai_chat_conversations
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON public.ai_chat_conversations
  FOR SELECT
  USING (is_admin(auth.uid()));
```

### Componente ConversationSidebar

Props:
- `conversations`: Lista de conversas do usuário
- `activeConversationId`: ID da conversa atual
- `onSelectConversation`: Callback ao selecionar
- `onNewConversation`: Callback para nova conversa
- `onRenameConversation`: Callback para renomear
- `onDeleteConversation`: Callback para excluir
- `isCollapsed`: Estado de colapso (mobile)

### Hooks Necessários

- `useConversations(agentId)`: Gerenciar CRUD de conversas
  - `conversations`: Lista de conversas
  - `activeConversation`: Conversa ativa
  - `createConversation()`: Criar nova
  - `updateConversation(id, data)`: Atualizar
  - `deleteConversation(id)`: Excluir
  - `selectConversation(id)`: Selecionar

### Modificações no ResearchAnalystChat

1. Adicionar state para `activeConversationId`
2. Adicionar state para `conversations`
3. Modificar `sendMessage` para salvar no banco após resposta
4. Adicionar lógica de carregamento de conversa existente
5. Integrar sidebar no layout

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| migração SQL | Criar | Tabela `ai_chat_conversations` |
| `src/components/ai-hub/ConversationSidebar.tsx` | Criar | Componente da sidebar |
| `src/hooks/useConversations.ts` | Criar | Hook de gerenciamento |
| `src/components/ai-hub/ResearchAnalystChat.tsx` | Modificar | Integrar sidebar e persistência |

## Considerações de UX

- Sidebar colapsável em dispositivos móveis
- Indicador visual da conversa ativa
- Confirmação antes de excluir conversa
- Debounce no salvamento para evitar chamadas excessivas
- Título truncado na sidebar com tooltip completo
- Ordenação por última atualização (mais recentes primeiro)

