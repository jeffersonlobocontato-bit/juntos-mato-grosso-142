## Problema

Hoje cada documento na biblioteca exibe a tarja vermelha "Sem tema vinculado — atualizar", mas **não existe nenhum controle na interface** para fazer essa vinculação. O componente `TemasMultiSelect` (que grava em `ai_document_temas`) já existe no projeto, mas nunca foi conectado ao `DocumentLibrary` nem ao `DocumentUploadModal`. Resultado: o usuário vê o alerta e fica sem ação possível.

## O que será feito

### 1. Editor inline de temas no card de cada documento (`DocumentLibrary.tsx`)

Substituir o badge vermelho estático por um controle clicável que abre um popover com o `TemasMultiSelect` (lista hierárquica Eixo → Temas, com checkboxes). Ao marcar/desmarcar:

- Insere/remove linhas em `ai_document_temas` (`document_id` + `tema_id`).
- Atualiza o estado local para mostrar imediatamente os badges dos temas selecionados.
- Exibe toast de confirmação.

Quando o documento já tem temas vinculados, manter os badges atuais e adicionar um botão pequeno "Editar" ao lado para reabrir o seletor.

### 2. Seleção de temas já no upload (`DocumentUploadModal.tsx`)

Incluir o mesmo `TemasMultiSelect` no formulário de criação, para que documentos novos já entrem na base com o vínculo correto. Após o `INSERT` em `ai_documents`, gravar as linhas em `ai_document_temas` na mesma operação.

### 3. Pequenos ajustes de UX

- Trocar o tom da tarja vermelha por amarelo/aviso enquanto o popover não estiver aberto (continua visível, mas menos agressivo).
- Tooltip explicando que vincular temas melhora a precisão do RAG e do gerador de Plano de Governo.

## Detalhes técnicos

- Tabela usada: `ai_document_temas (document_id uuid, tema_id uuid)`. Já tem RLS (`is_admin` para escrita, admin/líder para leitura) — nada novo a criar.
- A query atual já traz os temas via `ai_document_temas(temas(id, nome))`, então basta refazer `fetchDocuments()` ou atualizar o estado local após cada toggle.
- Componente `TemasMultiSelect` recebe `value: string[]` e `onChange(ids)` — encaixa direto.
- Nenhuma mudança de schema necessária.

## Arquivos afetados

- `src/components/admin/DocumentLibrary.tsx` — adicionar popover de edição de temas + handler de persistência.
- `src/components/admin/DocumentUploadModal.tsx` — adicionar seletor de temas no formulário e gravar vínculos após o insert.
