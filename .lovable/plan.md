
## Formulario de Sugestao com Multi-Selecao de Temas e Analise Semantica por IA

### Resumo
Transformar o formulario de sugestao publica para permitir selecao de multiplos temas (agrupados por eixo) via checkboxes, e ao submeter, usar IA para analisar semanticamente o texto e organizar as mencoes por tema.

### Mudancas na Interface (SuggestionForm.tsx)

**Antes:** Dropdown de eixo unico
**Depois:** Checkboxes de temas agrupados por eixo (accordion colapsavel)

- Buscar eixos e temas do banco de dados dinamicamente
- Exibir os 5 eixos como secoes (accordion/collapsible), cada um com seus temas como checkboxes
- O usuario pode marcar 1 ou mais temas de qualquer eixo
- Estado: `selectedTemaIds: string[]` (array de IDs de temas)
- Validacao: pelo menos 1 tema selecionado
- Na tela de confirmacao, mostrar os temas selecionados agrupados por eixo

### Mudancas no Banco de Dados

**Tabela `sugestoes_populares`:**
- Manter coluna `eixo` (text) para compatibilidade - gravar o primeiro eixo selecionado ou lista separada por virgula
- Adicionar coluna `tema_ids` (jsonb, nullable) - array dos IDs de temas selecionados
- Adicionar coluna `analise_semantica` (jsonb, nullable) - resultado da analise de IA organizando o texto por tema

### Nova Edge Function: `analyze-suggestion`

Chamada apos o insert da sugestao. Recebe o texto da sugestao e os temas selecionados. Usa IA (Gemini 2.5 Flash, via Lovable AI) para:

1. Ler o texto completo da sugestao
2. Para cada tema selecionado pelo usuario, extrair os trechos relevantes do texto
3. Retornar um JSON estruturado:

```text
{
  "analise": [
    {
      "tema_id": "uuid",
      "tema_nome": "Educacao",
      "eixo_nome": "Desenvolvimento Social",
      "trechos": ["trecho relevante 1", "trecho relevante 2"],
      "resumo": "O cidadao sugere melhoria na educacao basica..."
    }
  ]
}
```

4. Atualizar a coluna `analise_semantica` da sugestao com esse JSON

A chamada a IA sera assincrona (fire-and-forget apos o submit), para nao bloquear a experiencia do usuario.

### Mudancas no Admin (AdminSugestoes.tsx)

- No dialogo de visualizacao de sugestao, mostrar a analise semantica organizada por tema quando disponivel
- Cada tema com seus trechos e resumo em cards coloridos pelo eixo
- Filtros atualizados para suportar filtragem por tema alem de eixo

### Arquivos a criar/modificar

| Arquivo | Acao |
|---|---|
| `src/components/landing/SuggestionForm.tsx` | Refatorar para multi-select de temas com checkboxes agrupados por eixo |
| `supabase/functions/analyze-suggestion/index.ts` | Nova edge function para analise semantica via IA |
| `src/pages/AdminSugestoes.tsx` | Exibir analise semantica no dialogo de detalhes |
| Migration SQL | Adicionar colunas `tema_ids` e `analise_semantica` a `sugestoes_populares` |

### Detalhes Tecnicos

**Migration SQL:**
```text
ALTER TABLE sugestoes_populares
  ADD COLUMN tema_ids jsonb DEFAULT '[]',
  ADD COLUMN analise_semantica jsonb DEFAULT NULL;
```

**Edge Function `analyze-suggestion`:**
- Recebe `{ sugestao_id, descricao, tema_ids }` via POST
- Busca nomes dos temas no banco
- Chama Lovable AI (Gemini 2.5 Flash) com prompt para extrair trechos por tema
- Atualiza `sugestoes_populares.analise_semantica` com o resultado
- Chamada fire-and-forget no frontend (nao espera resposta para mostrar confirmacao)

**Fluxo do usuario:**
1. Preenche nome, email, municipio (como antes)
2. Seleciona 1+ temas via checkboxes agrupados por eixo
3. Escreve sua sugestao no textarea
4. Clica enviar -> insert imediato -> tela de confirmacao
5. Em background, edge function analisa e organiza o texto por tema

**Config TOML** (verify_jwt = false para permitir chamada publica):
```text
[functions.analyze-suggestion]
verify_jwt = false
```
