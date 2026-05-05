import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

function normalizeSource(raw: any): FichamentoSource | null {
  if (!raw || typeof raw.id !== 'number' || !raw.label) return null;
  const type = String(raw.type || 'outro');
  return {
    id: raw.id,
    type: (['documento', 'proposta', 'sugestao', 'pesquisa', 'entrevista'].includes(type) ? type : 'outro') as SourceType,
    label: String(raw.label).replace(/\s+/g, ' ').trim(),
    excerpt: raw.excerpt ? String(raw.excerpt).replace(/\s+/g, ' ').trim() : undefined,
  };
}

function parseSourcesPayload(payload: string): FichamentoSource[] {
  try {
    const parsed = JSON.parse(payload.trim());
    if (parsed && Array.isArray(parsed.sources)) {
      return parsed.sources.map(normalizeSource).filter(Boolean) as FichamentoSource[];
    }
  } catch {
    // abaixo há um parser tolerante para blocos JSON truncados pelo stream
  }

  const sources: FichamentoSource[] = [];
  const seen = new Set<number>();
  const objectRegex = /\{\s*"id"\s*:\s*(\d+)([\s\S]*?)(?=\n\s*,?\s*\{\s*"id"\s*:|\n\s*\]\s*\}|$)/g;
  let match: RegExpExecArray | null;

  while ((match = objectRegex.exec(payload)) !== null) {
    const id = Number(match[1]);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    const tail = match[2];
    const type = tail.match(/"type"\s*:\s*"([^"]+)"/)?.[1] || 'outro';
    const label = tail.match(/"label"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/i)?.[1];
    if (!label) continue;
    const excerpt = tail.match(/"excerpt"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/i)?.[1];
    const source = normalizeSource({ id, type, label, excerpt });
    if (source) {
      sources.push(source);
      seen.add(id);
    }
  }

  return sources;
}

export function parseFichamento(rawContent: string): { body: string; sources: FichamentoSource[] } {
  let body = rawContent || '';
  let sources: FichamentoSource[] = [];

  // Procura ```json { "sources": [...] } ``` no final (com tolerância a JSON incompleto)
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  const matches = Array.from(body.matchAll(jsonBlockRegex));

  for (const m of matches) {
    if (/"sources"\s*:/.test(m[1])) {
      sources = parseSourcesPayload(m[1]);
      // Remove o bloco JSON mesmo quando veio truncado/malformado
      body = body.replace(m[0], '').trim();
      break;
    }
  }

  if (sources.length === 0) {
    const trailingJson = body.match(/`{2,}\s*json\s*([\s\S]*)$/i);
    if (trailingJson && /"sources"\s*:/.test(trailingJson[1])) {
      sources = parseSourcesPayload(trailingJson[1]);
      body = body.slice(0, trailingJson.index).trim();
    }
  }

  return { body, sources };
}

// Tokeniza o corpo em "spans": { text } ou { ref: number }
interface BodySpan {
  text?: string;
  ref?: number;
}

function cleanMarkdownInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // remove asteriscos órfãos restantes (markdown malformado)
    .replace(/\*+/g, '');
}

function tokenizeText(text: string): BodySpan[] {
  const spans: BodySpan[] = [];
  const cleaned = cleanMarkdownInline(text.replace(/^#{1,6}\s*/gm, ''));
  const refRegex = /\[\^(\d+)\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = refRegex.exec(cleaned)) !== null) {
    if (match.index > lastIdx) spans.push({ text: cleaned.slice(lastIdx, match.index) });
    spans.push({ ref: parseInt(match[1], 10) });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < cleaned.length) spans.push({ text: cleaned.slice(lastIdx) });
  return spans;
}

function extractRefsFromText(text: string): number[] {
  return Array.from(new Set(
    Array.from(String(text).matchAll(/\[\^?(\d+)\]/g)).map(m => parseInt(m[1], 10)).filter(Number.isFinite)
  ));
}

function renderRefsAsInlineLabels(text: string): string {
  return String(text).replace(/\[\^?(\d+)\]/g, '[$1]');
}

// Blocos: parágrafo de texto, tabela markdown, ou heading
type Block =
  | { kind: 'para'; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] };

function isTableSeparatorLine(line: string): boolean {
  // | --- | :---: | ---: |
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => cleanMarkdownInline(c.trim()));
}

function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  let buffer: string[] = [];

  const flushPara = () => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (!text) return;
    // Detecta heading isolado
    const hMatch = text.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch && !text.includes('\n')) {
      blocks.push({ kind: 'heading', level: hMatch[1].length, text: hMatch[2].trim() });
      return;
    }
    blocks.push({ kind: 'para', text });
  };

  while (i < lines.length) {
    const line = lines[i];
    // Tabela markdown: header line + separator
    const isPipeLine = /\|/.test(line) && line.trim().startsWith('|');
    if (isPipeLine && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) {
      flushPara();
      const headers = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim().startsWith('|')) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      // Normaliza nº de colunas
      const colCount = headers.length;
      const normRows = rows.map(r => {
        const c = r.slice(0, colCount);
        while (c.length < colCount) c.push('');
        return c;
      });
      blocks.push({ kind: 'table', headers, rows: normRows });
      continue;
    }
    // Linha em branco => fecha parágrafo
    if (line.trim() === '') {
      flushPara();
      i++;
      continue;
    }
    buffer.push(line);
    i++;
  }
  flushPara();
  return blocks;
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

  // ---- PARSE EM BLOCOS --------------------------------------------------
  const blocks = parseBlocks(data.body);
  const sourcesById = new Map<number, FichamentoSource>();
  data.sources.forEach(s => sourcesById.set(s.id, s));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);

  const lineH = 5.2; // mm
  const paraGap = 2.5;
  const refPositions: { ref: number; page: number; x: number; y: number }[] = [];

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
    // Bolinha colorida com número centralizado
    const cx = cursorX + w / 2;
    const cy = cursorY - 1.6;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(cx, cy, 1.9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(String(n), cx, cy, { align: 'center', baseline: 'middle' });
    refPositions.push({ ref: n, page: pageNum, x: cursorX + w, y: cy });
    cursorX += w + 0.6;
  };

  const renderTextSpans = (spans: BodySpan[]) => {
    spans.forEach(sp => {
      if (sp.ref !== undefined) {
        writeRef(sp.ref);
        return;
      }
      const text = sp.text || '';
      const lines = text.split(/\n/);
      lines.forEach((part, li) => {
        if (li > 0) {
          cursorY += lineH;
          cursorX = mainX;
          ensureSpace(lineH);
        }
        const words = part.split(/(\s+)/);
        words.forEach(token => {
          if (!token) return;
          if (/^\s+$/.test(token)) {
            writeSpace();
          } else {
            writeWord(token);
          }
        });
      });
    });
  };

  // Render blocos
  for (const block of blocks) {
    if (block.kind === 'heading') {
      ensureSpace(lineH + 2);
      cursorX = mainX;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(block.level <= 2 ? 12 : 11);
      doc.setTextColor(20, 20, 20);
      const lines = doc.splitTextToSize(cleanMarkdownInline(block.text), mainColW);
      lines.forEach((ln: string) => {
        ensureSpace(lineH);
        doc.text(ln, mainX, cursorY);
        cursorY += lineH;
      });
      cursorY += paraGap;
      cursorX = mainX;
    } else if (block.kind === 'para') {
      const spans = tokenizeText(block.text);
      cursorX = mainX;
      renderTextSpans(spans);
      cursorY += lineH + paraGap;
      cursorX = mainX;
      ensureSpace(lineH);
    } else if (block.kind === 'table') {
      // Renderiza tabela na coluna principal usando autoTable
      ensureSpace(lineH * 3);
      const startY = cursorY - 1;
      const tableHeaders = block.headers.map(renderRefsAsInlineLabels);
      const tableRows = block.rows.map(row => row.map(renderRefsAsInlineLabels));
      autoTable(doc, {
        startY,
        margin: { left: mainX, right: pageW - (mainX + mainColW) },
        tableWidth: mainColW,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 1.5,
          textColor: [25, 25, 25],
          lineColor: [200, 200, 200],
          lineWidth: 0.15,
          overflow: 'linebreak',
          valign: 'top',
        },
        headStyles: {
          fillColor: BRAND_COLOR_RGB,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        alternateRowStyles: { fillColor: [248, 246, 240] },
        didDrawCell: (cellData) => {
          const refs = extractRefsFromText(String(cellData.cell.raw || ''));
          if (refs.length === 0 || cellData.section === 'head') return;
          const currentPage = (doc as any).internal?.getCurrentPageInfo?.().pageNumber || doc.getNumberOfPages();
          refs.forEach((ref, idx) => {
            refPositions.push({
              ref,
              page: currentPage,
              x: cellData.cell.x + cellData.cell.width,
              y: cellData.cell.y + 4 + idx * 3.2,
            });
          });
        },
        didDrawPage: () => {
          // Quando autoTable cria nova página, redesenha header/footer
          drawHeaderFooter(doc.getNumberOfPages(), '');
        },
      });
      // @ts-ignore - lastAutoTable é injetado pelo plugin
      const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY;
      cursorY = finalY + paraGap + 2;
      cursorX = mainX;
      // autoTable pode ter avançado de página
      pageNum = doc.getNumberOfPages();
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

  // Layout em duas passadas: pré-mede cada nota e empilha respeitando o anterior.
  // Notas que não couberem na coluna lateral da página vão para uma seção
  // "Notas (continuação)" no final do PDF.
  const LABEL_LH = 3.4;
  const EXCERPT_LH = 3.0;
  const TYPE_LH = 3.2;
  const NOTE_GAP = 3.5;
  const MAX_EXCERPT_LINES = 4;
  const textWidth = sideColW - 6.5;

  type NoteOverflow = { ref: number; src: FichamentoSource; fromPage: number; mainY: number };
  const overflow: NoteOverflow[] = [];

  const measureNote = (src: FichamentoSource): { labelLines: string[]; exLines: string[]; height: number } => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    const labelLines = doc.splitTextToSize(src.label, textWidth) as string[];
    let exLines: string[] = [];
    if (src.excerpt) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.4);
      const all = doc.splitTextToSize(`"${src.excerpt}"`, textWidth) as string[];
      if (all.length > MAX_EXCERPT_LINES) {
        exLines = all.slice(0, MAX_EXCERPT_LINES);
        const last = exLines[MAX_EXCERPT_LINES - 1].replace(/[\s"]+$/, '');
        exLines[MAX_EXCERPT_LINES - 1] = last + '…"';
      } else {
        exLines = all;
      }
    }
    const height = TYPE_LH + labelLines.length * LABEL_LH + exLines.length * EXCERPT_LH + 2;
    return { labelLines, exLines, height };
  };

  const drawNote = (
    src: FichamentoSource,
    ref: number,
    startY: number,
    labelLines: string[],
    exLines: string[],
  ): number => {
    const color = SOURCE_COLORS[src.type].rgb;
    // Bolinha + número
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(sideX + 2.2, startY - 1.6, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(String(ref), sideX + 2.2, startY - 0.9, { align: 'center', baseline: 'middle' });

    // Tipo
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(SOURCE_COLORS[src.type].label.toUpperCase(), sideX + 6.5, startY - 1.6);

    // Label
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    let lineY = startY + 1.6;
    labelLines.forEach((ln) => {
      doc.text(ln, sideX + 6.5, lineY);
      lineY += LABEL_LH;
    });

    // Excerto
    if (exLines.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.4);
      doc.setTextColor(90, 90, 90);
      exLines.forEach((ln) => {
        doc.text(ln, sideX + 6.5, lineY);
        lineY += EXCERPT_LH;
      });
    }
    return lineY;
  };

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const refs = (refsByPage.get(p) || []).sort((a, b) => a.mainY - b.mainY);
    let prevBottom = contentTop + 2;
    refs.forEach(({ ref, mainY }) => {
      const src = sourcesById.get(ref);
      if (!src) return;
      const { labelLines, exLines, height } = measureNote(src);
      const desired = Math.max(prevBottom, mainY - 1.5);
      // Não cabe nem empilhada? manda pra continuação
      if (desired + height > contentBottom) {
        overflow.push({ ref, src, fromPage: p, mainY });
        return;
      }
      const startY = desired;
      const color = SOURCE_COLORS[src.type].rgb;
      const lineEndY = drawNote(src, ref, startY, labelLines, exLines);

      // Conector
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(0.3);
      const fromX = mainX + mainColW + 0.5;
      const toX = sideX - 0.5;
      const midX = fromX + (toX - fromX) / 2;
      doc.line(fromX, mainY, midX, mainY);
      doc.line(midX, mainY, midX, startY - 1.5);
      doc.line(midX, startY - 1.5, toX, startY - 1.5);

      prevBottom = lineEndY + NOTE_GAP;
    });
  }

  // Página de continuação para notas que não couberam
  if (overflow.length > 0) {
    doc.addPage();
    pageNum = doc.getNumberOfPages();
    drawHeaderFooter(pageNum, '');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text('Notas (continuação)', mainX, contentTop + 4);
    let yCol = contentTop + 12;
    const colW = pageW - margin * 2;
    const noteWidth = colW - 8;
    overflow.forEach(({ ref, src, fromPage }) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      const labelLines = doc.splitTextToSize(src.label, noteWidth) as string[];
      let exLines: string[] = [];
      if (src.excerpt) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.4);
        const all = doc.splitTextToSize(`"${src.excerpt}"`, noteWidth) as string[];
        exLines = all.length > MAX_EXCERPT_LINES
          ? [...all.slice(0, MAX_EXCERPT_LINES - 1), all[MAX_EXCERPT_LINES - 1].replace(/[\s"]+$/, '') + '…"']
          : all;
      }
      const height = TYPE_LH + labelLines.length * LABEL_LH + exLines.length * EXCERPT_LH + 4;
      if (yCol + height > contentBottom) {
        doc.addPage();
        pageNum = doc.getNumberOfPages();
        drawHeaderFooter(pageNum, '');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text('Notas (continuação)', mainX, contentTop + 4);
        yCol = contentTop + 12;
      }
      const color = SOURCE_COLORS[src.type].rgb;
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(mainX + 2.2, yCol - 1.6, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(String(ref), mainX + 2.2, yCol - 0.9, { align: 'center', baseline: 'middle' });
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFontSize(7);
      doc.text(`${SOURCE_COLORS[src.type].label.toUpperCase()} — pág. ${fromPage}`, mainX + 6.5, yCol - 1.6);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      let lineY = yCol + 1.6;
      labelLines.forEach((ln) => { doc.text(ln, mainX + 6.5, lineY); lineY += LABEL_LH; });
      if (exLines.length) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.4);
        doc.setTextColor(90, 90, 90);
        exLines.forEach((ln) => { doc.text(ln, mainX + 6.5, lineY); lineY += EXCERPT_LH; });
      }
      yCol = lineY + NOTE_GAP + 1;
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
  const blocks = parseBlocks(data.body);
  const sourcesById = new Map<number, FichamentoSource>();
  data.sources.forEach(s => sourcesById.set(s.id, s));

  // Helper: spans -> runs
  const spansToRuns = (spans: BodySpan[]): TextRun[] => {
    const runs: TextRun[] = [];
    spans.forEach(t => {
      if (t.ref !== undefined) {
        const src = sourcesById.get(t.ref);
        const color = src ? SOURCE_COLORS[src.type].hex : SOURCE_COLORS.outro.hex;
        runs.push(new TextRun({ text: ` [${t.ref}] `, bold: true, color, size: 18, font: 'Arial' }));
      } else if (t.text) {
        runs.push(new TextRun({ text: t.text.replace(/\n/g, ' ').replace(/\s+/g, ' '), font: 'Arial', size: 22 }));
      }
    });
    return runs;
  };

  // ---- Coluna esquerda: parágrafos + tabelas --------------------------
  const usedRefs = new Set<number>();
  const leftChildren: (Paragraph | Table)[] = [];

  // Largura da célula esquerda definida abaixo (leftW). Calculada antes:
  const tableWidth = 9026;
  const leftW = Math.round(tableWidth * 0.66);
  const rightW = tableWidth - leftW;
  const innerLeftW = leftW - 200; // descontando margem direita interna

  for (const block of blocks) {
    if (block.kind === 'heading') {
      leftChildren.push(
        new Paragraph({
          children: [new TextRun({ text: cleanMarkdownInline(block.text), bold: true, size: block.level <= 2 ? 26 : 24, font: 'Arial' })],
          spacing: { before: 200, after: 120 },
        })
      );
    } else if (block.kind === 'para') {
      const spans = tokenizeText(block.text);
      spans.forEach(s => s.ref !== undefined && usedRefs.add(s.ref));
      leftChildren.push(
        new Paragraph({
          children: spansToRuns(spans),
          spacing: { after: 160, line: 300 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    } else if (block.kind === 'table') {
      block.headers.forEach(h => extractRefsFromText(h).forEach(ref => usedRefs.add(ref)));
      block.rows.forEach(row => row.forEach(c => extractRefsFromText(c).forEach(ref => usedRefs.add(ref))));
      const colCount = block.headers.length || 1;
      const colW = Math.floor(innerLeftW / colCount);
      const colWidths = Array(colCount).fill(colW);
      const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
      const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

      const headerRow = new TableRow({
        tableHeader: true,
        children: block.headers.map((h, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            borders: allBorders,
            shading: { fill: 'D4AF37', type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: renderRefsAsInlineLabels(h), bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })],
          })
        ),
      });
      const bodyRows = block.rows.map((r, ri) =>
        new TableRow({
          children: r.map((c, i) =>
            new TableCell({
              width: { size: colWidths[i], type: WidthType.DXA },
              borders: allBorders,
              shading: ri % 2 === 1 ? { fill: 'FAF7EE', type: ShadingType.CLEAR, color: 'auto' } : undefined,
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: renderRefsAsInlineLabels(c), size: 18, font: 'Arial' })] })],
            })
          ),
        })
      );
      leftChildren.push(
        new Table({
          width: { size: innerLeftW, type: WidthType.DXA },
          columnWidths: colWidths,
          rows: [headerRow, ...bodyRows],
        })
      );
      leftChildren.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 120 } }));
    }
  }

  // ---- Coluna direita: lista de notas ---------------------------------
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
            children: leftChildren.length ? leftChildren : [new Paragraph({ text: '' })],
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