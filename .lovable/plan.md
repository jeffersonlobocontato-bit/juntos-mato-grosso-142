## Objetivo

Permitir que cada plano de governo gerado pela IA no `/admin/plano-governo` seja exportado em **PDF** ou **DOCX** no formato **fichamento acadêmico**: texto principal numa coluna larga à esquerda, notas de fonte (documento, entrevista, sugestão, pesquisa) numa coluna estreita à direita em fonte menor, com **numeração colorida por tipo de fonte** e linhas conectoras ligando cada marcação à respectiva nota.

## Como vai funcionar

### 1. A IA passa a marcar fontes inline

Vou ajustar o prompt da edge function `plano-governo-ai` para que, em todos os modos relevantes (`plano`, `brainstorm`, `cruzamento`, `balanco`, `conteudo`, `coerencia`), a IA insira marcadores no texto e um bloco JSON com as fontes ao final, no padrão:

```text
A política proposta amplia a cobertura da APS em 18%[^1] e prevê
contratação de 1.200 ACS até 2027[^2], alinhada à demanda popular[^3].

```json
{
  "sources": [
    { "id": 1, "type": "documento",  "label": "Plano Estadual de Saúde 2024", "excerpt": "..." },
    { "id": 2, "type": "proposta",   "label": "Proposta nº 482 — Dr. João Silva", "excerpt": "..." },
    { "id": 3, "type": "sugestao",   "label": "Sugestão popular — Cascavel/PR" }
  ]
}
```
```

A IA só pode citar itens que estiverem **realmente** nas fontes que a edge function injetou no contexto (regra anti-alucinação reforçada no prompt). Mantemos compatibilidade: se vier sem o bloco, o exportador funciona como texto simples.

### 2. Botão "Exportar fichamento" em cada resposta da IA

Em cada balão de resposta da IA, ao lado do botão "Copiar" existente, aparece um menu **Exportar** com duas opções:
- "Baixar PDF (fichamento)"
- "Baixar Word (.docx) (fichamento)"

### 3. Layout do fichamento

```text
┌──────────────────────────────────────────┬─────────────────────┐
│  PLANO DE GOVERNO — TÍTULO               │  FONTES             │
│  Eixo · Filtros aplicados · Data         │  (col. estreita)    │
├──────────────────────────────────────────┼─────────────────────┤
│  A política proposta amplia a            │  ① Plano Estadual   │
│  cobertura da APS em 18%①                │     de Saúde 2024   │
│  e prevê contratação de 1.200 ACS────────┼──② Proposta 482 —   │
│  até 2027②, alinhada à demanda───────────┼──③  Dr. João Silva  │
│  popular③.                               │  ③ Sugestão popular │
│                                          │     — Cascavel/PR   │
│  …                                       │                     │
└──────────────────────────────────────────┴─────────────────────┘
```

- **Coluna esquerda**: ~65% da largura, fonte 11pt, redação corrida do plano.
- **Coluna direita**: ~32% da largura, fonte 8.5pt, cada nota com bolinha colorida + número + rótulo + breve excerto/origem.
- **Linhas conectoras** (apenas no PDF) ligam o número no texto à respectiva nota, ajustadas via cálculo de posição absoluta após renderizar.
- **Cores por tipo de fonte** (alinhadas à identidade Juntos Paraná):
  - Documento da biblioteca → **Azul** (`#1E5BA8`)
  - Proposta técnica / Entrevista → **Verde** (`#1F8A4C`)
  - Sugestão popular → **Roxo** (`#7B3FA0`)
  - Pesquisa eleitoral → **Âmbar** (`#C77E1A`)
- Cabeçalho com logo/título "Juntos Paraná 399" e rodapé com numeração de páginas + data.
- Tipografia: **Montserrat** (títulos) / **Inter** (corpo). Como Inter pode não estar disponível no PDF gerado client-side, fallback para Helvetica/Arial.

### 4. Tecnologias do exportador

- **PDF**: `jspdf` + `jspdf-autotable` (já flexível para colunas, posicionamento absoluto e desenho de linhas conectoras via `doc.line`). Renderização em duas colunas com cálculo manual de Y-offset para alinhar cada nota perto do marcador correspondente.
- **DOCX**: `docx` (já presente no projeto, usado em `entrevistaExport.ts`). Layout em **tabela de 2 colunas sem bordas externas**, células com fundo levemente colorido por bloco. No DOCX, em vez de linhas conectoras (limitação do formato), os números das notas são pintados na cor do tipo e a nota lateral espelha a mesma cor — o leitor segue pela cor, não pela linha física.
- Ambos exportadores ficam em `src/utils/planoGovernoFichamentoExport.ts` (PDF) e reutilizam helpers compartilhados.

## Mudanças técnicas

### Arquivo novo: `src/utils/planoGovernoFichamentoExport.ts`
- `parseFichamento(rawMarkdown)` — extrai texto + bloco JSON de fontes (regex similar à do parser de cruzamento).
- `exportFichamentoPDF({ title, body, sources, filters })` — gera PDF de 2 colunas com conectores.
- `exportFichamentoDOCX({ title, body, sources, filters })` — gera DOCX usando tabela 2 colunas com cores por tipo.
- `SOURCE_COLORS` map (azul/verde/roxo/âmbar).

### Arquivo novo: `src/components/admin/FichamentoExportButton.tsx`
- Botão `DropdownMenu` com ícone de download. Recebe `content` da mensagem, `mode`, `filters`, `eixoNome`. Chama um dos dois exporters.

### `src/pages/AdminPlanoGoverno.tsx`
- Importar `FichamentoExportButton`.
- Adicionar o botão ao lado do "Copiar" existente em cada balão `assistant`.
- Passar título contextual (`Plano de Governo — ${analysisMode}`) e os filtros ativos para metadados do documento.

### `supabase/functions/plano-governo-ai/index.ts`
- Acrescentar ao prompt de **todos os modos** uma seção "FORMATO DE CITAÇÃO DE FONTES" pedindo:
  1. Inserir `[^N]` no fim das frases que se baseiam em uma fonte do contexto.
  2. Ao final da resposta, incluir um bloco `\`\`\`json { "sources": [...] } \`\`\`` listando cada nota numerada com `type` (`documento` | `proposta` | `sugestao` | `pesquisa` | `entrevista`), `label` (nome legível) e opcionalmente `excerpt`.
  3. Regra anti-alucinação: usar **apenas** itens listados nas seções "DOCUMENTOS DA BASE", "PROPOSTAS TÉCNICAS", "SUGESTÕES POPULARES" e "PESQUISAS" do contexto. Se não houver fonte verificável para uma afirmação, **não citar**.
  4. Se nenhum dado de contexto estiver disponível, omitir o bloco JSON e os marcadores.

Sem mudanças de schema. Sem mudanças em outras telas.

## Resultado para o usuário

Depois que a IA responde com um plano, o gestor clica em **Exportar → PDF (fichamento)** e recebe um documento profissional, em duas colunas, com cada afirmação ligada visualmente à fonte de onde veio (documento, entrevista, sugestão ou pesquisa) — pronto para revisão impressa, com a mesma rastreabilidade de um fichamento acadêmico. O DOCX permite edição posterior pelo time mantendo as cores e a estrutura das notas marginais.