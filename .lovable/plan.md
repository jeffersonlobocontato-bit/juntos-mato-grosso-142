
# Adicionar Upload de Arquivos por Modo de Analise

## O que sera feito

Cada aba de modo no `ModeConfigPanel` ganhara uma secao "Biblioteca de Documentos" onde o admin pode:

1. **Fazer upload de arquivos** (PDF, TXT, etc.) ou **colar texto** diretamente -- igual ao que ja existe no AgentEditor do Hub de IA
2. **Ver documentos vinculados** ao modo especifico
3. **Vincular/desvincular documentos existentes** da base `ai_documents`
4. **Remover documentos** da biblioteca do modo

## Como funciona

- Cada modo ja tem um registro na tabela `ai_agent_config` com um `id` unico
- A tabela `ai_agent_documents` (join table) ja existe e vincula `agent_id` a `document_id`
- Os arquivos sao armazenados no bucket `ai-documents` (ja existente e publico)
- Nenhuma alteracao de banco de dados e necessaria -- toda a infraestrutura ja existe

## Detalhes Tecnicos

### Arquivo modificado: `src/components/admin/ModeConfigPanel.tsx`

Adicionar a cada aba do modo:

1. **Estado para documentos**: lista de documentos vinculados por modo, estado de upload
2. **Fetch de documentos vinculados**: ao carregar configs, buscar `ai_agent_documents` para cada `config.id`
3. **Secao de upload**: formulario com dois modos (arquivo ou texto), titulo obrigatorio
   - Upload de arquivo: envia para o bucket `ai-documents`, cria registro em `ai_documents`, vincula via `ai_agent_documents`
   - Texto direto: cria registro em `ai_documents` com o conteudo, vincula ao modo
4. **Lista de documentos**: exibe documentos vinculados com botao para desvincular
5. **Seletor de documentos existentes**: checkbox para vincular documentos ja cadastrados na base

O padrao de upload sera reutilizado do `AgentEditor.tsx` (linhas 302-393), adaptado para funcionar dentro das abas do ModeConfigPanel.
