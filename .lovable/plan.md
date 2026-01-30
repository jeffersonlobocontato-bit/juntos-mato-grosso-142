

## ✅ CONCLUÍDO: Implementação de Seleção Hierárquica: Eixo, Tema e Subtema no Questionário

### Alterações Realizadas

#### 1. Banco de Dados
- ✅ Adicionada coluna `subtema_id` na tabela `propostas_tecnicas` com FK para `subtemas(id)`

#### 2. Formulário (EntrevistaForm.tsx)
- ✅ Novas interfaces: `Tema` e `Subtema`
- ✅ Novos estados: `temaId`, `subtemaId`, `temas`, `subtemas`
- ✅ Funções de fetch: `fetchTemas()`, `fetchSubtemas()`
- ✅ Efeitos de cascata implementados:
  - Ao mudar eixo → limpa tema e subtema
  - Ao mudar tema → limpa subtema
- ✅ UI atualizada com 3 seletores em cascata:
  - Eixo Temático * (obrigatório)
  - Tema * (obrigatório, filtrado pelo eixo)
  - Subtema (opcional, filtrado pelo tema)
- ✅ Validação atualizada para exigir tema
- ✅ Submit inclui `tema_id` e `subtema_id`
- ✅ Reset limpa todos os campos

### Fluxo de Uso
1. Entrevistador seleciona o Eixo (ex: Desenvolvimento Social)
2. O campo Tema carrega apenas temas daquele eixo
3. Entrevistador seleciona o Tema (obrigatório)
4. O campo Subtema carrega subtemas daquele tema
5. Subtema é opcional para tagueamento mais preciso
