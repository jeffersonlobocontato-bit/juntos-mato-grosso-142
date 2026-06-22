# Cadernos de Propostas — PDF e Word

Gerar documentos impressos com **todas as propostas técnicas na íntegra**, organizadas por eixo, com tags de tema/subtema e marcação simples de referência cruzada quando outras propostas compartilharem o mesmo subtema.

## Escopo confirmado

- **Conteúdo:** todas as propostas (`rascunho`, `em_analise`, `aprovada`) — sem resumos, sem reescrita, texto integral.
- **Arquivos:** 2 modos
  - **Por eixo:** 1 arquivo por eixo
  - **Consolidado:** 1 caderno único com os 5 eixos
- **Formatos:** PDF e Word (.docx) em ambos os modos.
- **Referência cruzada:** rodapé simples em cada proposta — "Ver também: nº 12, nº 27 (mesmo subtema)" — sem texto gerado por IA.
- **Local da feature:** aba **Propostas Técnicas** (`/admin/propostas`).

## Layout do documento

**Capa**
- Logo / IDV "Juntos Paraná 399" (dourado da identidade)
- Subtítulo: "Sergio Moro — Pré-candidato ao Governo do Paraná"
- Título: nome do eixo OU "Caderno Completo — 5 Eixos Temáticos"
- Data de geração + total de propostas

**Sumário** (só no consolidado): 5 eixos com contagem e nº da página.

**Por eixo**
- Cabeçalho colorido com nome do eixo (usando `EIXO_HEX_COLORS` de `eixoHelpers.ts`)
- Propostas ordenadas: `aprovada` → `em_analise` → `rascunho`, depois por título
- Numeração sequencial dentro do eixo (#1, #2, ...)

**Bloco de cada proposta**
```
#12 — [Título]                                       [badge status]
Autor: ...  ·  Município: ...  ·  Etapa: 2/3

Descrição:
[texto integral]

Metas:
[texto integral]

Indicadores:
[texto integral]

Tags: [Eixo] [Tema] [Subtema]   (chips coloridos)

Ver também: nº 7, nº 19 (mesmo subtema)
─────────────────────────────────
```

**Rodapé**: "Juntos Paraná 399 · Sergio Moro" à esquerda · nº da página à direita.

## Implementação técnica

**Stack** (já instalado, reaproveita o padrão de `planoGovernoFichamentoExport.ts`):
- `jspdf` + `jspdf-autotable` para PDF
- `docx` + `file-saver` para Word

**Arquivos a criar**
- `src/utils/cadernoPropostasExport.ts` — gerador PDF + DOCX
- `src/components/admin/CadernoPropostasExportButton.tsx` — dropdown com 4 grupos de opções:
  - Caderno completo (PDF)
  - Caderno completo (Word)
  - Por eixo › Eixo X (PDF) / (Word) — para cada um dos 5 eixos

**Arquivos a modificar**
- `src/pages/AdminPropostas.tsx` — adicionar o botão no cabeçalho da página.

**Query de dados**
```ts
supabase.from('propostas_tecnicas')
  .select(`
    id, titulo, descricao, metas, indicadores, status, etapa,
    tipo_proposta, instituicao_nome, representante_nome,
    eixo_id, tema_id, subtema_id,
    eixos_tematicos:eixo_id(nome, ordem),
    temas:tema_id(nome),
    subtemas:subtema_id(nome),
    municipios:municipio_id(nome),
    profiles:autor_id(full_name)
  `)
```

**Referência cruzada** (cliente, sem IA):
- Agrupar por `subtema_id` (ignorando nulos).
- Para cada proposta, listar nº das outras no mesmo grupo dentro do mesmo eixo.
- Truncar com "e mais N" se passar de ~10 referências.

**Cores e identidade**
- Reaproveitar `BRAND_COLOR_RGB` (dourado [212,175,55]) e `EIXO_HEX_COLORS`.
- Badge de status: verde (aprovada), âmbar (em_analise), cinza (rascunho).

**Permissões**
- Botão "Caderno completo" visível só para `admin` / `admin_master`.
- `lider_tematico` vê só os botões dos eixos aos quais tem acesso (via `useUserAccess`).

## Fora de escopo

- Resumos / notas geradas por IA.
- Detecção semântica de similaridade (só agrupamento por subtema).
- Anexos embutidos (PDF/Word só com texto).
- `propostas_politicas` e `sugestoes_populares` — só `propostas_tecnicas`.

## QA pós-implementação

Vou gerar 1 PDF de exemplo de cada modo (consolidado e de 1 eixo) e inspecionar páginas-chave (capa, sumário, 1 eixo cheio, transição entre eixos, rodapé) antes de entregar.
