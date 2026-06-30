# Plano: Filtros cruzados (Eixo + Subtemas) no Gerador de Conteúdo

## Objetivo
Permitir que, ao selecionar fontes (documentos, propostas técnicas, propostas políticas, sugestões populares, pesquisas), o usuário também filtre por **Eixo Temático** e **Subtemas específicos**, criando cruzamentos do tipo:
- "Documento Pelti" + Eixo "Infraestrutura" + subtemas X, Y
- "Documentos de Segurança Pública" + Eixo "Segurança" + subtemas escolhidos

Esses filtros restringem o que aparece nas listas selecionáveis e também são enviados à IA como contexto de recorte temático.

## Mudanças

### 1. `CommsContentSourceSelector.tsx`
- Adicionar painel superior **"Recorte temático (opcional)"** com:
  - Select de **Eixo** (carrega de `eixos_tematicos`).
  - Multi-select de **Subtemas** (carrega de `subtemas` filtrado pelo eixo via `temas`).
  - Botão "Limpar recorte".
- Ao mudar eixo/subtemas:
  - Refetch das listas filtrando por `eixo_id` / `subtema_id` (quando a tabela tem o campo): `ai_documents` (via `ai_document_temas`), `propostas_tecnicas` (`eixo_id`, `subtema_id`), `propostas_politicas` (`eixo_id`), `sugestoes_populares` (`tema_ids` jsonb / classificação semântica), `pesquisas_eleitorais` (texto livre — manter sem filtro, apenas marcar como "sem recorte").
  - Mostrar contagem filtrada.
- Manter seleção individual por item (não substitui a lógica atual).

### 2. Interface `CommsSourceSelection`
Adicionar:
```ts
eixoFiltroId?: string | null;
subtemaFiltroIds?: string[];
```

### 3. `AdminGeradorConteudo.tsx`
- Inicializar os novos campos no estado.
- Repassar ao body da edge function.

### 4. Edge Function `generate-comms-content`
- Ler `eixoFiltroId` e `subtemaFiltroIds` do body.
- Quando presentes, aplicar como filtro adicional nas queries de fontes (defesa em profundidade — front já filtra, mas garantir no servidor).
- Incluir no prompt do sistema uma linha: "Recorte temático: Eixo {nome} / Subtemas: {lista}" para a IA focar a geração.

## Detalhes técnicos
- Subtemas no schema atual: `temas` → `subtemas`, com `temas.eixo_id`. Para popular subtemas do eixo, fazer join `subtemas → temas` onde `temas.eixo_id = X`.
- `ai_documents`: cruzamento via tabela `ai_document_temas` (tem `tema_id`).
- `sugestoes_populares`: tem coluna `eixo` (texto) e classificação semântica em `tema_ids` (jsonb). Filtrar por match de eixo nome OU por tema_ids contendo subtemas.
- Filtros são "AND" entre eixo e subtemas, e se subtemas estiver vazio considera só o eixo.

## Fora de escopo
- Não alterar o esquema do banco.
- Não mudar a UI de geração/refinamento (só o seletor de fontes).
