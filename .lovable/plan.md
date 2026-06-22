## Incluir anexos das propostas no Caderno

Hoje o caderno exporta apenas título, descrição, objetivos e indicadores. Os arquivos enviados pelo entrevistado em `propostas_tecnicas.anexos` são ignorados. Vou tratá-los como parte da resposta.

### O que será adicionado em cada proposta
1. Seção **"Anexos"** listando todos os arquivos (título + link clicável para o storage `proposta-anexos`).
2. Para cada anexo PDF, seção **"Conteúdo do anexo: <título>"** com o texto extraído (até ~8.000 caracteres por anexo para não explodir o caderno; corte com aviso "[...texto truncado]").
3. Anexos não-PDF (imagens, docx, xlsx) → apenas listados com link, sem extração.
4. Se a extração falhar (PDF escaneado / protegido / erro de rede) → marca "[Não foi possível extrair texto deste anexo]" e mantém o link.

### Como a extração vai funcionar
- Nova edge function `extract-pdf-text` (Deno, `verify_jwt = false` padrão Lovable, valida JWT em código).
  - Input: `{ url: string }` (URL pública do anexo).
  - Faz `fetch` do PDF, usa `npm:pdfjs-dist` para extrair texto página a página, devolve `{ text, pages, truncated }`.
  - Limite: 50 páginas / 8.000 chars; timeout 25s.
- No `CadernoPropostasExportButton.tsx`, antes de chamar o gerador:
  - Reúne todos os anexos PDF de todas as propostas selecionadas.
  - Chama a edge function em paralelo com `Promise.allSettled` (concorrência limitada a 4 com um pequeno pool) e mostra progresso no toast ("Extraindo texto dos anexos: 12/34").
  - Resultado fica em `Map<anexoPath, { text, error }>` e é injetado no objeto da proposta antes de passar para `exportCadernoPDF` / `exportCadernoDOCX`.

### Mudanças nos geradores (`src/utils/cadernoPropostasExport.ts`)
- Estender `CadernoProposta` com `anexos: { titulo: string; url: string; tipo: string; textoExtraido?: string; erroExtracao?: string }[]`.
- PDF (`drawProposta`): após indicadores, renderiza bloco "Anexos" (lista com bullets dourados) e, para cada PDF com texto, um sub-bloco "Conteúdo do anexo — <título>" em fonte menor com quebra de página automática.
- DOCX (`docxPropostaBlock`): mesmas seções usando `Paragraph` + `ExternalHyperlink` para os links e parágrafos normais para o texto extraído.
- Cross-references (`Ver também`) permanecem inalteradas.

### Arquivos
- **Novo:** `supabase/functions/extract-pdf-text/index.ts`
- **Editar:** `src/components/admin/CadernoPropostasExportButton.tsx` (buscar `anexos`, parsear JSON, orquestrar extração com toast de progresso)
- **Editar:** `src/utils/cadernoPropostasExport.ts` (tipos + render de anexos em PDF e DOCX)

### Fora de escopo
- OCR de PDFs escaneados (apenas extração de texto nativo).
- Extração de DOCX/XLSX/imagens.
- Embed de miniaturas de imagens.

### QA pós-implementação
- Gerar caderno de 1 eixo que contenha pelo menos 1 proposta com PDF anexo e 1 com imagem; inspecionar PDF e DOCX confirmando lista de anexos, links clicáveis e texto extraído paginando corretamente.
