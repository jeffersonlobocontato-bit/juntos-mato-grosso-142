

## Persistência de dados do formulário de entrevista com cache local

### Problema
Quando o usuário muda de aba no navegador e volta, todo o conteúdo digitado no formulário de entrevista é perdido. Isso ocorre porque o estado é mantido apenas em memória (React `useState`).

### Solução
Implementar auto-save em `sessionStorage` para todos os campos do formulário. O `sessionStorage` persiste enquanto a aba estiver aberta (mesmo em segundo plano) e sobrevive a re-renders causados pelo React.

### Mudanças no arquivo `src/components/entrevista/EntrevistaForm.tsx`

1. **Criar chave de storage** — `"entrevista_draft"` como constante.

2. **Carregar draft ao montar** — No `useEffect` inicial, verificar se existe draft no `sessionStorage` e restaurar todos os campos: `entrevistado`, `entrevistadoEmail`, `entrevistadoCelular`, `municipioId`, `eixoId`, `temaId`, `subtemaIds`, `questionario`, `titulo`, `currentStep`.

3. **Salvar automaticamente a cada mudança** — Adicionar um `useEffect` com debounce (~500ms) que observa todos os campos do formulário e salva o estado completo no `sessionStorage` como JSON.

4. **Limpar draft ao submeter** — Após o envio bem-sucedido, remover o item do `sessionStorage`.

5. **Exibir toast de restauração** — Quando dados são restaurados do cache, exibir um toast informando "Rascunho restaurado" para que o usuário saiba que seus dados foram recuperados.

### Detalhes técnicos

- Usar `sessionStorage` (não `localStorage`) para que o draft seja por aba/sessão
- O debounce evita escrita excessiva no storage durante digitação
- Campos como `eixoId` que disparam fetches dependentes (temas, subtemas) serão restaurados na ordem correta via `useEffect` existentes que já observam essas variáveis
- A flag `eixoLocked` também será persistida

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/components/entrevista/EntrevistaForm.tsx` | Adicionar lógica de save/restore com `sessionStorage` |

