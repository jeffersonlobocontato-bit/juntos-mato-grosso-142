
# Configuracao Individual por Modo + Selecao Multi-Categoria de Documentos

## Resumo

Duas melhorias no modulo "Gerador de Plano de Governo" (`/admin/plano-governo`):

1. **Configuracao individual por modo de analise** -- Cada um dos 6 modos (Plano de Governo, Brainstorming, Cruzamento, Balanco, Conteudo, Coerencia) tera suas proprias instrucoes customizaveis, similar ao que o ChatGPT Plus permite com GPTs customizados.

2. **Selecao multi-categoria de documentos** -- O filtro "Tipo de Documento" passara de selecao unica (dropdown) para selecao multipla (checkboxes), permitindo escolher 1 ou mais categorias simultaneamente.

---

## Parte 1: Configuracao Individual por Modo

### O que muda

Atualmente, existe uma unica configuracao de agente (`ai_agent_config` com `agent_type = 'plano_governo'`) que se aplica a todos os 6 modos. A edge function `plano-governo-ai` usa prompts hardcoded por modo.

Com a mudanca:
- Cada modo tera seu proprio registro na tabela `ai_agent_config` (ex: `agent_type = 'plano_governo_plano'`, `plano_governo_brainstorm'`, etc.)
- Um painel de configuracao permitira editar titulo, descricao e instrucoes de cada modo
- A edge function buscara a instrucao customizada do modo especifico e a usara como complemento (ou substituicao) do prompt padrao

### Banco de Dados

Nova migracao para inserir 6 registros na tabela `ai_agent_config`:

```text
agent_type: plano_governo_plano
agent_type: plano_governo_brainstorm
agent_type: plano_governo_cruzamento
agent_type: plano_governo_balanco
agent_type: plano_governo_conteudo
agent_type: plano_governo_coerencia
```

Cada um com `name`, `description`, `system_prompt` pre-preenchidos com os prompts atuais (que hoje estao hardcoded na edge function).

### Interface (UI)

- Substituir o componente `AIConfigPanel` antigo (que configura apenas 1 agente generico) por um novo painel `ModeConfigPanel` dentro da pagina `/admin/plano-governo`
- O painel tera 6 abas (uma por modo), cada uma com:
  - Campo de titulo (nome do modo)
  - Campo de descricao
  - Campo de instrucoes (system prompt) -- textarea grande
- Botao "Salvar" por modo
- Visivel apenas para usuarios admin

### Edge Function (`plano-governo-ai`)

- Ao receber o `mode`, buscar `ai_agent_config` com `agent_type = 'plano_governo_{mode}'`
- Se existir instrucao customizada, usa-la no lugar do prompt hardcoded
- Se nao existir, manter o fallback para o prompt padrao atual

---

## Parte 2: Selecao Multi-Categoria de Documentos

### O que muda

O filtro "Tipo de Documento" no `DataSourceFilters` atualmente e um `Select` (dropdown) que permite escolher apenas 1 categoria por vez. Sera substituido por checkboxes que permitem selecionar multiplas categorias.

### Interface (UI)

- Alterar `DataSourceFilters.tsx`: substituir o `Select` de `docCategory` por uma lista de checkboxes (similar ao seletor de fontes de dados)
- O campo `docCategory` no tipo `DataFilters` mudara de `string` para `string[]` (array)
- Cada categoria (Plano de Governo, Documento Tecnico, Noticia, etc.) sera um checkbox individual
- Botoes "Todos" e "Limpar" para conveniencia

### Propagacao

- `AdminPlanoGoverno.tsx`: atualizar o estado inicial de `filters.docCategory` de `''` para `[]`
- `AdminPlanoGoverno.tsx`: atualizar a query de documentos para usar `.in('doc_category', ...)` quando multiplas categorias estiverem selecionadas
- Edge function `plano-governo-ai`: atualizar o tipo de `docCategory` de `string` para `string[]` e usar `.in()` no filtro

---

## Sequencia de Implementacao

1. Migracao de banco: inserir 6 registros de config por modo
2. Atualizar edge function para buscar config por modo e aceitar `docCategory` como array
3. Criar componente `ModeConfigPanel` na UI
4. Atualizar `DataSourceFilters` para multi-selecao de categorias
5. Atualizar `AdminPlanoGoverno` para integrar ambas as mudancas
