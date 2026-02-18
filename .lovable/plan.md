
## Atualizar Lista de Eixos Tematicos de 8 para 5 em toda a plataforma

### Problema
Varios pontos da plataforma ainda usam a lista antiga de 8 eixos tematicos (Educacao, Saude, Seguranca Publica, Infraestrutura, Agricultura e Meio Ambiente, Economia e Turismo, Desenvolvimento Social, Tecnologia e Inovacao). O banco de dados ja foi atualizado para os 5 novos eixos:

1. Desenvolvimento Social (Qualidade de Vida)
2. Desenvolvimento Economico Sustentavel (Geracao de Emprego e Renda)
3. Desenvolvimento das Cidades e Infraestrutura (Viver e Transitar)
4. Gestao Publica Eficiente (Controlar)
5. Seguranca, Justica, Combate a Corrupcao

### Arquivos a modificar (8 arquivos)

#### 1. `src/components/landing/SuggestionForm.tsx`
- Substituir array hardcoded de 8 eixos (linhas 15-24) pelos 5 novos eixos
- Ou melhor: buscar eixos dinamicamente do banco de dados como o EixoTemaSelector ja faz

#### 2. `src/pages/AdminSugestoes.tsx`
- Substituir array `eixoOptions` de 8 eixos (linhas 65-75) pelos 5 novos
- Atualizar `eixoColorMap` (linhas 77-87) para os 5 novos eixos usando cores do `eixoHelpers.ts`

#### 3. `src/pages/Dashboard.tsx`
- Substituir dados mock `proposalsByEixo` (linhas 37-46) para refletir 5 eixos
- Atualizar filtro de eixos no Select (linhas 112-117) para os 5 novos

#### 4. `src/components/admin/EixoComparisonPanel.tsx`
- Substituir `EIXO_COLORS` (linhas 28-37) pelos 5 novos eixos, importando de `eixoHelpers.ts`

#### 5. `src/components/admin/ParanaMap.tsx`
- Substituir `defaultEixoColors` (linhas 36-45) pelos 5 novos eixos, importando de `eixoHelpers.ts`

#### 6. `src/components/liderancas/ProposalConfirmationMap.tsx`
- Substituir `eixoColors` (linhas 15-24) pelos 5 novos eixos, importando de `eixoHelpers.ts`

#### 7. `supabase/functions/plano-governo-ai/index.ts`
- Atualizar prompt do modo "plano" (linha 370) de "8 eixos tematicos: Agricultura e Meio Ambiente..." para "5 eixos tematicos: Desenvolvimento Social, Desenvolvimento Economico Sustentavel, Desenvolvimento das Cidades e Infraestrutura, Gestao Publica Eficiente, Seguranca Justica e Combate a Corrupcao"

#### 8. `src/components/entrevista/EntrevistaForm.tsx`
- Os indicadores por eixo (linhas 183-290) usam UUIDs antigos que nao correspondem aos novos eixos no banco. Atualizar os UUIDs para os novos IDs dos eixos e reorganizar os indicadores nos 5 eixos corretos

### Abordagem
- Sempre que possivel, importar cores de `src/utils/eixoHelpers.ts` (que ja tem os 5 eixos corretos) em vez de duplicar
- Para o formulario de sugestao publica, buscar eixos do banco dinamicamente
- Redeployar a edge function `plano-governo-ai` apos a alteracao

### Nota sobre seed-test-users
O arquivo `supabase/functions/seed-test-users/index.ts` referencia os 8 eixos antigos nos usuarios de teste. Sera mantido como esta por ser dados de teste internos, conforme decisao anterior.
