import jsPDF from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  HeadingLevel,
  PageOrientation,
} from 'docx';
import { saveAs } from 'file-saver';

// =====================================================================
// TIPOS E CONSTANTES
// =====================================================================

export type SourceType = 'documento' | 'proposta' | 'sugestao' | 'pesquisa' | 'entrevista' | 'outro';

export interface FichamentoSource {
  id: number;
  type: SourceType;
  label: string;
  excerpt?: string;
}

export interface FichamentoData {
  title: string;
  subtitle?: string;
  body: string; // texto principal com marcadores [^N]
  sources: FichamentoSource[];
  filtersSummary?: string; // ex: "Eixo: Saúde · Município: Curitiba"
  modeLabel?: string;
}

// Cores por tipo de fonte (RGB para PDF, HEX para DOCX)
const SOURCE_COLORS: Record<SourceType, { rgb: [number, number, number]; hex: string; label: string }> = {
  documento:  { rgb: [30, 91, 168],  hex: '1E5BA8', label: 'Documento' },
  proposta:   { rgb: [31, 138, 76],  hex: '1F8A4C', label: 'Proposta técnica' },
  entrevista: { rgb: [31, 138, 76],  hex: '1F8A4C', label: 'Entrevista' },
  sugestao:   { rgb: [123, 63, 160], hex: '7B3FA0', label: 'Sugestão popular' },
  pesquisa:   { rgb: [199, 126, 26], hex: 'C77E1A', label: 'Pesquisa eleitoral' },
  outro:      { rgb: [100, 100, 100], hex: '666666', label: 'Outro' },
};

const BRAND_COLOR_RGB: [number, number, number] = [212, 175, 55]; // dourado da identidade

// =====================================================================
// PARSER — extrai texto + bloco JSON de fontes da resposta da IA
// =====================================================================

export function parseFichamento(rawContent: string): { body: string; sources: FichamentoSource[] } {
  let body = rawContent || '';
  let sources: FichamentoSource[] = [];

  // Procura ```json { "sources": [...] } ``` no final
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/gi;
  const matches = Array.from(body.matchAll(jsonBlockRegex));

  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (parsed && Array.isArray(parsed.sources)) {
        sources = parsed.sources
          .filter((s: any) => s && typeof s.id === 'number' && typeof s.label === 'string')
          .map((s: any) => ({
            id: s.id,
            type: (['documento', 'proposta', 'sugestao', 'pesquisa', 'entrevista'].includes(s.type)
              ? s.type
              : 'outro') as SourceType,
            label: String(s.label).trim(),
            excerpt: s.excerpt ? String(s.excerpt).trim() : undefined,
          }));
        // Remove o bloco JSON do corpo para não aparecer no documento final
        body = body.replace(m[0], '').trim();
        break;
      }
    } catch {
      // ignora bloco JSON malformado
    }
  }

  return { body, sources };
}

// Tokeniza o corpo em "spans": { text } ou { ref: number }
interface BodySpan {
  text?: string;
  ref?: number;
}

function tokenizeBody(body: string): BodySpan[] {
  const spans: BodySpan[] = [];
  // Remove markdown leve para impressão (#, **, *) — preserva quebras de linha
  const cleaned = body
    .replace(/^#{1,6}\s*/gm, '') // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  const refRegex = /\[\^(\d+)\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = refRegex.exec(cleaned)) !== null) {
    if (match.index > lastIdx) {
      spans.push({ text: cleaned.slice(lastIdx, match.index) });
    }
    spans.push({ ref: parseInt(match[1], 10) });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < cleaned.length) {
    spans.push({ text: cleaned.slice(lastIdx) });
  }
  return spans;
}

// =====================================================================
// EXPORT PDF — duas colunas com conectores
// =====================================================================

export function exportFichamentoPDF(data: FichamentoData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Layout das colunas (mm)
  const gap = 6;
  const sideColW = 62;
  const mainColW = pageW - margin * 2 - gap - sideColW;
  const mainX = margin;
  const sideX = margin + mainColW + gap;

  const headerH = 22;
  const footerH = 12;
  const contentTop = margin + headerH;
  const contentBottom = pageH - footerH;

  // ---- HEADER / FOOTER --------------------------------------------------
  const drawHeaderFooter = (pageNum: number, totalPagesPlaceholder: string) => {
    // Faixa dourada
    doc.setFillColor(...BRAND_COLOR_RGB);
    doc.rect(0, 0, pageW, 8, 'F');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text(data.title, margin, margin + 6);

    // Subtítulo
    if (data.subtitle || data.filtersSummary || data.modeLabel) {
      const subParts = [data.modeLabel, data.subtitle, data.filtersSummary].filter(Boolean).join(' · ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(subParts, margin, margin + 11);
    }

    // Linha separadora abaixo do header
    doc.setDrawColor(...BRAND_COLOR_RGB);
    doc.setLineWidth(0.4);
    doc.line(margin, contentTop - 2, pageW - margin, contentTop - 2);

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Juntos Paraná 399 · Fichamento gerado em ${dateStr}`, margin, pageH - 6);
    doc.text(`Página ${pageNum} ${totalPagesPlaceholder}`, pageW - margin, pageH - 6, { align: 'right' });

    // Linha vertical sutil entre as colunas
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(mainX + mainColW + gap / 2, contentTop, mainX + mainColW + gap / 2, contentBottom);
  };

  // ---- TOKENIZAÇÃO ------------------------------------------------------
  const spans = tokenizeBody(data.body);
  const sourcesById = new Map<number, FichamentoSource>();
  data.sources.forEach(s => sourcesById.set(s.id, s));

  // Quebra spans em parágrafos (separados por \n\n) e depois em linhas que cabem na coluna principal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);

  // Estrutura de renderização: lista de tokens visuais por página
  type VisualToken = { kind: 'word'; text: string } | { kind: 'ref'; n: number } | { kind: 'space' } | { kind: 'br' } | { kind: 'parabreak' };
  const tokens: VisualToken[] = [];
  spans.forEach(sp => {
    if (sp.ref !== undefined) {
      tokens.push({ kind: 'ref', n: sp.ref });
      return;
    }
    const text = sp.text || '';
    // separa por \n
    const parts = text.split(/\n/);
    parts.forEach((part, i) => {
      const words = part.split(/\s+/).filter(Boolean);
      const wasBlankLineBefore = i > 0 && (parts[i - 1] === '' || parts[i - 1].trim() === '');
      if (i > 0) {
        // detectar parágrafo (linha em branco)
        if (wasBlankLineBefore || part.trim() === '') {
          tokens.push({ kind: 'parabreak' });
        } else {
          tokens.push({ kind: 'br' });
        }
      }
      words.forEach((w, wi) => {
        if (wi > 0) tokens.push({ kind: 'space' });
        tokens.push({ kind: 'word', text: w });
      });
    });
  });

  // Renderiza por palavra/referência calculando wrap e capturando posição (x, y) de cada ref
  const lineH = 5.2; // mm
  const paraGap = 2.5;
  const refPositions: { ref: number; page: number; x: number; y: number }[] = [];
  const noteSlots: Map<number, { ref: number; page: number; mainY: number }> = new Map();

  let cursorX = mainX;
  let cursorY = contentTop + 2;
  let pageNum = 1;

  drawHeaderFooter(pageNum, '');

  const newPage = () => {
    doc.addPage();
    pageNum += 1;
    drawHeaderFooter(pageNum, '');
    cursorX = mainX;
    cursorY = contentTop + 2;
  };

  const ensureSpace = (height: number) => {
    if (cursorY + height > contentBottom) {
      newPage();
    }
  };

  const writeWord = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(25, 25, 25);
    const w = doc.getTextWidth(text);
    if (cursorX + w > mainX + mainColW) {
      cursorY += lineH;
      cursorX = mainX;
      ensureSpace(lineH);
    }
    doc.text(text, cursorX, cursorY);
    cursorX += w;
  };

  const writeSpace = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const w = doc.getTextWidth(' ');
    if (cursorX + w > mainX + mainColW) {
      cursorY += lineH;
      cursorX = mainX;
      ensureSpace(lineH);
      return;
    }
    cursorX += w;
  };

  const writeRef = (n: number) => {
    const src = sourcesById.get(n);
    const color = src ? SOURCE_COLORS[src.type].rgb : SOURCE_COLORS.outro.rgb;
    const label = `[${n}]`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const w = doc.getTextWidth(label);
    if (cursorX + w > mainX + mainColW) {
      cursorY += lineH;
      cursorX = mainX;
      ensureSpace(lineH);
    }
    // Pequena bolinha colorida de fundo
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(cursorX + w / 2, cursorY - 1.6, 1.6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, cursorX + w / 2, cursorY - 0.8, { align: 'center', baseline: 'middle' });
    // Posição do marcador para o conector
    refPositions.push({ ref: n, page: pageNum, x: cursorX + w, y: cursorY - 1.5 });
    if (!noteSlots.has(`${pageNum}-${n}` as any)) {
      noteSlots.set(n, { ref: n, page: pageNum, mainY: cursorY - 1.5 });
    }
    cursorX += w + 0.5;
  };

  for (const t of tokens) {
    if (t.kind === 'word') writeWord(t.text);
    else if (t.kind === 'space') writeSpace();
    else if (t.kind === 'ref') writeRef(t.n);
    else if (t.kind === 'br') {
      cursorY += lineH;
      cursorX = mainX;
      ensureSpace(lineH);
    } else if (t.kind === 'parabreak') {
      cursorY += lineH + paraGap;
      cursorX = mainX;
      ensureSpace(lineH);
    }
  }

  // ---- COLUNA DIREITA: NOTAS POR PÁGINA --------------------------------
  // Agrupa refs por página
  const totalPages = doc.getNumberOfPages();
  const refsByPage = new Map<number, { ref: number; mainY: number }[]>();
  refPositions.forEach(rp => {
    if (!refsByPage.has(rp.page)) refsByPage.set(rp.page, []);
    const arr = refsByPage.get(rp.page)!;
    if (!arr.find(a => a.ref === rp.ref)) arr.push({ ref: rp.ref, mainY: rp.y });
  });

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const refs = (refsByPage.get(p) || []).sort((a, b) => a.mainY - b.mainY);
    let noteY = contentTop + 2;
    const minGap = 11; // espaço mínimo entre notas
    refs.forEach(({ ref, mainY }) => {
      const src = sourcesById.get(ref);
      if (!src) return;
      const color = SOURCE_COLORS[src.type].rgb;
      const targetY = Math.max(noteY, mainY - 1.5);
      const startY = Math.min(targetY, contentBottom - 12);
      // Bolinha + número
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(sideX + 2.2, startY - 1.6, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(String(ref), sideX + 2.2, startY - 0.9, { align: 'center', baseline: 'middle' });

      // Tipo (etiqueta)
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(SOURCE_COLORS[src.type].label.toUpperCase(), sideX + 6.5, startY - 1.6);

      // Label do documento/entrevista
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      const labelLines = doc.splitTextToSize(src.label, sideColW - 6.5);
      let lineY = startY + 1.6;
      labelLines.forEach((ln: string) => {
        doc.text(ln, sideX + 6.5, lineY);
        lineY += 3.4;
      });

      // Excerto
      if (src.excerpt) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.4);
        doc.setTextColor(90, 90, 90);
        const exLines = doc.splitTextToSize(`"${src.excerpt}"`, sideColW - 6.5);
        exLines.forEach((ln: string) => {
          doc.text(ln, sideX + 6.5, lineY);
          lineY += 3.0;
        });
      }

      // Linha conectora — desenhada com pequena curva visual (poliline)
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(0.3);
      const fromX = mainX + mainColW + 0.5;
      const toX = sideX - 0.5;
      const midX = fromX + (toX - fromX) / 2;
      doc.line(fromX, mainY, midX, mainY);
      doc.line(midX, mainY, midX, startY - 1.5);
      doc.line(midX, startY - 1.5, toX, startY - 1.5);

      noteY = lineY + 4;
    });
  }

  // ---- SALVA ------------------------------------------------------------
  const safeTitle = (data.title || 'fichamento').replace(/[^\w\-]+/g, '_').slice(0, 60);
  doc.save(`${safeTitle}_fichamento.pdf`);
}

// =====================================================================
// EXPORT DOCX — tabela de 2 colunas com cores por tipo de fonte
// =====================================================================

export async function exportFichamentoDOCX(data: FichamentoData): Promise<void> {
  const spans = tokenizeBody(data.body);
  const sourcesById = new Map<number, FichamentoSource>();
  data.sources.forEach(s => sourcesById.set(s.id, s));

  // ---- Coluna esquerda: parágrafos ------------------------------------
  // Quebra spans em parágrafos por kind 'parabreak'
  type ParaToken = { text?: string; ref?: number };
  const paragraphsTokens: ParaToken[][] = [[]];
  spans.forEach(sp => {
    if (sp.ref !== undefined) {
      paragraphsTokens[paragraphsTokens.length - 1].push({ ref: sp.ref });
      return;
    }
    const text = (sp.text || '').replace(/\r/g, '');
    const parts = text.split(/\n\s*\n/);
    parts.forEach((part, i) => {
      if (i > 0) paragraphsTokens.push([]);
      const cleaned = part.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      if (cleaned) paragraphsTokens[paragraphsTokens.length - 1].push({ text: cleaned });
    });
  });

  const leftParagraphs: Paragraph[] = paragraphsTokens
    .filter(toks => toks.length > 0)
    .map(toks => {
      const runs: TextRun[] = [];
      toks.forEach(t => {
        if (t.text !== undefined) {
          runs.push(new TextRun({ text: t.text, font: 'Arial', size: 22 })); // 11pt
        } else if (t.ref !== undefined) {
          const src = sourcesById.get(t.ref);
          const color = src ? SOURCE_COLORS[src.type].hex : SOURCE_COLORS.outro.hex;
          runs.push(
            new TextRun({
              text: ` [${t.ref}] `,
              bold: true,
              color,
              size: 18, // 9pt
              font: 'Arial',
            })
          );
        }
      });
      return new Paragraph({
        children: runs,
        spacing: { after: 160, line: 300 },
        alignment: AlignmentType.JUSTIFIED,
      });
    });

  // ---- Coluna direita: lista de notas ---------------------------------
  const usedRefs = new Set<number>();
  spans.forEach(sp => sp.ref !== undefined && usedRefs.add(sp.ref));
  const notesInOrder = data.sources.filter(s => usedRefs.has(s.id));

  const rightParagraphs: Paragraph[] = [];
  rightParagraphs.push(
    new Paragraph({
      children: [new TextRun({ text: 'FONTES', bold: true, size: 18, font: 'Arial', color: '666666' })],
      spacing: { after: 160 },
    })
  );

  notesInOrder.forEach(src => {
    const color = SOURCE_COLORS[src.type].hex;
    rightParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `[${src.id}] `, bold: true, color, size: 18, font: 'Arial' }),
          new TextRun({
            text: SOURCE_COLORS[src.type].label.toUpperCase(),
            bold: true,
            color,
            size: 14,
            font: 'Arial',
          }),
        ],
        spacing: { before: 80, after: 20 },
      })
    );
    rightParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: src.label, bold: true, size: 16, font: 'Arial' })],
        spacing: { after: 20 },
      })
    );
    if (src.excerpt) {
      rightParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `"${src.excerpt}"`, italics: true, size: 15, color: '5A5A5A', font: 'Arial' }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  });

  if (notesInOrder.length === 0) {
    rightParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'Nenhuma fonte citada nesta resposta.', italics: true, size: 15, color: '888888', font: 'Arial' })],
      })
    );
  }

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const allNoBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  // A4 retrato content width ≈ 9026 DXA (descontando margens 1440 cada lado)
  const tableWidth = 9026;
  const leftW = Math.round(tableWidth * 0.66);
  const rightW = tableWidth - leftW;

  const table = new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: [leftW, rightW],
    borders: allNoBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: leftW, type: WidthType.DXA },
            borders: {
              top: noBorder,
              bottom: noBorder,
              left: noBorder,
              right: { style: BorderStyle.SINGLE, size: 4, color: 'D4AF37' },
            },
            margins: { top: 80, bottom: 80, left: 0, right: 200 },
            children: leftParagraphs.length ? leftParagraphs : [new Paragraph({ text: '' })],
          }),
          new TableCell({
            width: { size: rightW, type: WidthType.DXA },
            borders: allNoBorders,
            margins: { top: 80, bottom: 80, left: 200, right: 0 },
            shading: { fill: 'FAFAFA', type: ShadingType.CLEAR, color: 'auto' },
            children: rightParagraphs,
          }),
        ],
      }),
    ],
  });

  const headerParts = [data.modeLabel, data.subtitle, data.filtersSummary].filter(Boolean).join(' · ');

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: data.title, bold: true, size: 32, font: 'Arial' })],
            spacing: { after: 80 },
          }),
          ...(headerParts
            ? [
                new Paragraph({
                  children: [new TextRun({ text: headerParts, italics: true, size: 18, color: '666666', font: 'Arial' })],
                  spacing: { after: 120 },
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({
                text: `Juntos Paraná 399 — Fichamento gerado em ${new Date().toLocaleDateString('pt-BR')}`,
                size: 14,
                color: '999999',
                font: 'Arial',
              }),
            ],
            spacing: { after: 240 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D4AF37', space: 4 } },
          }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = (data.title || 'fichamento').replace(/[^\w\-]+/g, '_').slice(0, 60);
  saveAs(blob, `${safeTitle}_fichamento.docx`);
}