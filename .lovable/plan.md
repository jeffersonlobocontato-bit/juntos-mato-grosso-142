## Objetivo

Permitir que o entrevistador anexe documentos relacionados à proposta diretamente na **última aba do questionário (Etapa 8 — Título)**, antes de clicar em "Registrar Entrevista" — em vez de só aparecer na tela de sucesso após o envio.

## Situação atual

- O componente `PropostaAnexosUpload` já existe e funciona, mas só é renderizado **após** o submit (tela `isSubmitted`), pois depende de `propostaId` (gerado pelo insert no banco).
- Na etapa 8, hoje só há o campo "Título da Proposta".

## Solução

Criar um **modo pré-submit**: o usuário seleciona/descreve os arquivos na etapa 8, eles ficam em memória (staging), e após o submit bem-sucedido (quando a proposta é criada e temos o `id`), o upload ao Storage acontece automaticamente em background, persistindo no campo `anexos` da `propostas_tecnicas`.

A tela de sucesso continua mostrando o `PropostaAnexosUpload` para permitir adicionar/remover mais anexos depois (sem regressão).

### Mudanças

**1. `src/components/entrevista/PropostaAnexosUpload.tsx`**
- Adicionar prop opcional `mode?: "staging" | "live"` (default `"live"`).
- No modo `"staging"`: não recebe `propostaId`/`eixoId`, não acessa Supabase. Mantém apenas a lista de `File` selecionados em estado local e expõe via callback `onFilesChange(files: File[], descriptions: string[])`.
- Reaproveita a mesma UI (dropzone, lista, validação de tamanho/extensão, botão remover).

**2. `src/components/entrevista/EntrevistaForm.tsx`**
- Novo estado: `pendingAnexos: { file: File; description: string }[]`.
- **Etapa 8 (Título):** abaixo do campo de título, renderizar `<PropostaAnexosUpload mode="staging" onFilesChange={...} />` com um título tipo "Anexar documentos (opcional)".
- Após `submitEntrevista` retornar o `propostaId` (linhas próximas a 459), executar uma rotina `uploadPendingAnexos(propostaId, eixoId)` que:
  - Faz upload de cada arquivo para o bucket `proposta-anexos` no path `${eixoId}/${propostaId}/${ts}-${safeName}`.
  - Monta o array `AnexoItem[]` e faz `update` em `propostas_tecnicas.anexos` (mesma serialização JSON usada hoje).
  - Mostra toast de sucesso/erro; falhas não bloqueiam o submit (a proposta já foi criada).
- Reaproveitar as constantes `MAX_SIZE_MB` e `ALLOWED_EXT` (exportá-las do componente).
- Manter o `PropostaAnexosUpload` na tela de sucesso (modo `"live"`) — assim o usuário ainda pode adicionar mais arquivos depois, e os já enviados aparecem na lista.

**3. Rascunho (auto-save)**
- O auto-save atual de rascunho (linhas ~262/270) NÃO inclui os anexos pendentes (objetos `File` não serializam). Adicionar um aviso curto na seção de upload da etapa 8: "Os arquivos só são enviados após registrar a entrevista — não ficam salvos no rascunho."

## Arquivos afetados

- `src/components/entrevista/PropostaAnexosUpload.tsx` — adicionar modo `staging` + callback.
- `src/components/entrevista/EntrevistaForm.tsx` — renderizar uploader na etapa 8, gerenciar fila pendente, fazer upload pós-submit.

Sem mudanças de banco, RLS, edge functions ou bucket (já existem).
