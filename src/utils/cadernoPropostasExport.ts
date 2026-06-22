import jsPDF from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  BorderStyle,
  ExternalHyperlink,
} from 'docx';
import { saveAs } from 'file-saver';
import { EIXO_HEX_COLORS } from './eixoHelpers';

// =====================================================================
// TIPOS
// =====================================================================

export interface CadernoProposta {
  id: string;
  titulo: string;
  descricao: string | null;
  metas: string | null;
  indicadores: string | null;
  status: string;
  etapa: number | null;
  eixo_id: string;
  tema_id: string | null;
  subtema_id: string | null;
  autor_nome: string | null;
  municipio_nome: string | null;
  eixo_nome: string;
  tema_nome: string | null;
  subtema_nome: string | null;
  anexos?: CadernoAnexo[];
}

export interface CadernoAnexo {
  titulo: string;
  nome: string;
  url: string;
  tipo: string; // extensão lowercase (pdf, png, ...)
  textoExtraido?: string;
  erroExtracao?: string;
}

export interface CadernoEixo {
  id: string;
  nome: string;
  ordem: number;
}

export interface CadernoData {
  title: string;
  eixos: CadernoEixo[];
  propostas: CadernoProposta[];
}

// =====================================================================
// CONSTANTES VISUAIS
// =====================================================================

const BRAND_GOLD_RGB: [number, number, number] = [212, 175, 55];
const BRAND_GOLD_HEX = 'D4AF37';
const BRAND_DARK_HEX = '0F172A';

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  em_analise: 'Em Análise',
  aprovada: 'Aprovada',
};

const STATUS_COLOR_RGB: Record<string, [number, number, number]> = {
  aprovada: [34, 197, 94],
  em_analise: [245, 158, 11],
  rascunho: [148, 163, 184],
};

const STATUS_COLOR_HEX: Record<string, string> = {
  aprovada: '22C55E',
  em_analise: 'F59E0B',
  rascunho: '94A3B8',
};

const STATUS_ORDER: Record<string, number> = {
  aprovada: 0,
  em_analise: 1,
  rascunho: 2,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// =====================================================================
// PREPARAÇÃO DOS DADOS
// =====================================================================

interface PreparedProposta extends CadernoProposta {
  numero: number;
  verTambem: number[];
}

interface PreparedEixo {
  eixo: CadernoEixo;
  propostas: PreparedProposta[];
}

function preparePropostasPorEixo(data: CadernoData): PreparedEixo[] {
  return data.eixos
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((eixo) => {
      const propostas: PreparedProposta[] = data.propostas
        .filter((p) => p.eixo_id === eixo.id)
        .sort((a, b) => {
          const sa = STATUS_ORDER[a.status] ?? 9;
          const sb = STATUS_ORDER[b.status] ?? 9;
          if (sa !== sb) return sa - sb;
          return a.titulo.localeCompare(b.titulo, 'pt-BR');
        })
        .map((p, idx) => ({ ...p, numero: idx + 1, verTambem: [] }));

      const bySubtema = new Map<string, number[]>();
      propostas.forEach((p) => {
        if (!p.subtema_id) return;
        const arr = bySubtema.get(p.subtema_id) ?? [];
        arr.push(p.numero);
        bySubtema.set(p.subtema_id, arr);
      });
      propostas.forEach((p) => {
        if (!p.subtema_id) return;
        const all = bySubtema.get(p.subtema_id) ?? [];
        p.verTambem = all.filter((n) => n !== p.numero);
      });

      return { eixo, propostas };
    })
    .filter((e) => e.propostas.length > 0);
}

function formatVerTambem(nums: number[]): string {
  if (nums.length === 0) return '';
  const max = 10;
  if (nums.length <= max) return `nº ${nums.join(', nº ')}`;
  const shown = nums.slice(0, max);
  return `nº ${shown.join(', nº ')} e mais ${nums.length - max}`;
}

function todayBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// =====================================================================
// PDF
// =====================================================================

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

interface PdfState {
  pdf: jsPDF;
  y: number;
  pageNum: number;
}

function newPdfState(): PdfState {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  return { pdf, y: MARGIN_TOP, pageNum: 1 };
}

function drawFooter(st: PdfState) {
  const { pdf, pageNum } = st;
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_X, PAGE_H - MARGIN_BOTTOM + 6, PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text('Juntos Paraná 399 · Sergio Moro', MARGIN_X, PAGE_H - MARGIN_BOTTOM + 11);
  pdf.text(String(pageNum), PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM + 11, { align: 'right' });
}

function newPage(st: PdfState) {
  drawFooter(st);
  st.pdf.addPage();
  st.pageNum += 1;
  st.y = MARGIN_TOP;
}

function ensureSpace(st: PdfState, needed: number) {
  if (st.y + needed > PAGE_H - MARGIN_BOTTOM) {
    newPage(st);
  }
}

function writeWrapped(
  st: PdfState,
  text: string,
  opts: { fontSize?: number; bold?: boolean; color?: [number, number, number]; indent?: number; lineHeight?: number } = {},
) {
  const { pdf } = st;
  const fontSize = opts.fontSize ?? 10;
  const lineHeight = opts.lineHeight ?? fontSize * 0.45;
  const indent = opts.indent ?? 0;
  pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  pdf.setFontSize(fontSize);
  const c = opts.color ?? [30, 30, 30];
  pdf.setTextColor(c[0], c[1], c[2]);
  const lines = pdf.splitTextToSize(text, CONTENT_W - indent);
  for (const line of lines) {
    ensureSpace(st, lineHeight + 1);
    pdf.text(line, MARGIN_X + indent, st.y);
    st.y += lineHeight;
  }
}

function drawCover(st: PdfState, title: string, subtitle: string, totalPropostas: number) {
  const { pdf } = st;
  pdf.setFillColor(BRAND_GOLD_RGB[0], BRAND_GOLD_RGB[1], BRAND_GOLD_RGB[2]);
  pdf.rect(0, 0, PAGE_W, 12, 'F');

  st.y = 70;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Juntos Paraná 399', PAGE_W / 2, st.y, { align: 'center' });
  st.y += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.setTextColor(120, 90, 20);
  pdf.text('Sergio Moro — Pré-candidato ao Governo do Paraná', PAGE_W / 2, st.y, { align: 'center' });
  st.y += 30;

  pdf.setDrawColor(BRAND_GOLD_RGB[0], BRAND_GOLD_RGB[1], BRAND_GOLD_RGB[2]);
  pdf.setLineWidth(0.8);
  pdf.line(PAGE_W / 2 - 40, st.y, PAGE_W / 2 + 40, st.y);
  st.y += 18;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(15, 23, 42);
  const titleLines = pdf.splitTextToSize(title, CONTENT_W - 20);
  for (const line of titleLines) {
    pdf.text(line, PAGE_W / 2, st.y, { align: 'center' });
    st.y += 10;
  }

  st.y += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(80, 80, 80);
  pdf.text(subtitle, PAGE_W / 2, st.y, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `${totalPropostas} proposta${totalPropostas === 1 ? '' : 's'} · Gerado em ${todayBR()}`,
    PAGE_W / 2,
    PAGE_H - 30,
    { align: 'center' },
  );
  pdf.setFillColor(BRAND_GOLD_RGB[0], BRAND_GOLD_RGB[1], BRAND_GOLD_RGB[2]);
  pdf.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');

  pdf.addPage();
  st.pageNum += 1;
  st.y = MARGIN_TOP;
}

function drawSummary(st: PdfState, prepared: PreparedEixo[]) {
  const { pdf } = st;
  writeWrapped(st, 'Sumário', { fontSize: 18, bold: true, color: [15, 23, 42] });
  st.y += 4;

  prepared.forEach(({ eixo, propostas }) => {
    const color = hexToRgb(EIXO_HEX_COLORS[eixo.nome] ?? '#64748B');
    ensureSpace(st, 10);
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(MARGIN_X, st.y - 3, 3, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 30, 30);
    pdf.text(`${eixo.ordem}. ${eixo.nome}`, MARGIN_X + 6, st.y + 1.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(110, 110, 110);
    pdf.text(`${propostas.length} proposta${propostas.length === 1 ? '' : 's'}`, PAGE_W - MARGIN_X, st.y + 1.5, {
      align: 'right',
    });
    st.y += 9;
  });

  st.y += 4;
  newPage(st);
}

function drawEixoHeader(st: PdfState, eixo: CadernoEixo, total: number) {
  const { pdf } = st;
  if (st.y > MARGIN_TOP + 1) {
    newPage(st);
  }
  const color = hexToRgb(EIXO_HEX_COLORS[eixo.nome] ?? '#64748B');
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.rect(0, 0, PAGE_W, 22, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`EIXO ${eixo.ordem}`, MARGIN_X, 10);
  pdf.setFontSize(15);
  const nomeLines = pdf.splitTextToSize(eixo.nome, CONTENT_W);
  pdf.text(nomeLines[0], MARGIN_X, 17);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${total} proposta${total === 1 ? '' : 's'}`, PAGE_W - MARGIN_X, 17, { align: 'right' });

  st.y = 32;
}

function drawStatusBadge(st: PdfState, status: string, x: number, y: number) {
  const { pdf } = st;
  const color = STATUS_COLOR_RGB[status] ?? [148, 163, 184];
  const label = STATUS_LABEL[status] ?? status;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const w = pdf.getTextWidth(label) + 5;
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.roundedRect(x - w, y - 4, w, 5.5, 1, 1, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text(label, x - w / 2, y, { align: 'center' });
}

function drawTagChip(st: PdfState, label: string, color: [number, number, number], x: number, y: number): number {
  const { pdf } = st;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  const w = pdf.getTextWidth(label) + 5;
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.roundedRect(x, y - 3.5, w, 5, 1, 1, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text(label, x + w / 2, y, { align: 'center' });
  return w;
}

function drawProposta(st: PdfState, p: PreparedProposta, eixo: CadernoEixo) {
  const { pdf } = st;
  ensureSpace(st, 30);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(15, 23, 42);
  const numStr = `#${p.numero}`;
  pdf.text(numStr, MARGIN_X, st.y);
  const numW = pdf.getTextWidth(numStr) + 3;

  drawStatusBadge(st, p.status, PAGE_W - MARGIN_X, st.y);

  const tituloX = MARGIN_X + numW;
  const tituloMaxW = CONTENT_W - numW - 30;
  const tituloLines = pdf.splitTextToSize(p.titulo, tituloMaxW);
  pdf.text(tituloLines[0], tituloX, st.y);
  st.y += 6;
  for (let i = 1; i < tituloLines.length; i++) {
    ensureSpace(st, 6);
    pdf.text(tituloLines[i], tituloX, st.y);
    st.y += 6;
  }
  st.y += 1;

  const metaParts: string[] = [];
  if (p.autor_nome) metaParts.push(`Autor: ${p.autor_nome}`);
  metaParts.push(`Município: ${p.municipio_nome ?? 'Estadual'}`);
  if (p.etapa != null) metaParts.push(`Etapa: ${p.etapa}/3`);
  writeWrapped(st, metaParts.join('  ·  '), {
    fontSize: 8.5,
    color: [110, 110, 110],
    lineHeight: 4,
  });
  st.y += 2;

  const sections: Array<{ label: string; text: string | null }> = [
    { label: 'Descrição', text: p.descricao },
    { label: 'Metas', text: p.metas },
    { label: 'Indicadores', text: p.indicadores },
  ];
  for (const s of sections) {
    if (!s.text || !s.text.trim()) continue;
    ensureSpace(st, 8);
    writeWrapped(st, s.label, { fontSize: 9.5, bold: true, color: [120, 90, 20], lineHeight: 4.5 });
    writeWrapped(st, s.text.trim(), { fontSize: 10, color: [30, 30, 30], lineHeight: 4.8 });
    st.y += 1.5;
  }

  const eixoColor = hexToRgb(EIXO_HEX_COLORS[eixo.nome] ?? '#64748B');
  const tags: Array<{ label: string; color: [number, number, number] }> = [
    { label: eixo.nome, color: eixoColor },
  ];
  if (p.tema_nome) tags.push({ label: `Tema: ${p.tema_nome}`, color: [71, 85, 105] });
  if (p.subtema_nome) tags.push({ label: `Subtema: ${p.subtema_nome}`, color: [100, 116, 139] });

  ensureSpace(st, 8);
  let chipX = MARGIN_X;
  for (const t of tags) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    const w = pdf.getTextWidth(t.label) + 5;
    if (chipX + w > PAGE_W - MARGIN_X) {
      st.y += 6;
      chipX = MARGIN_X;
      ensureSpace(st, 8);
    }
    drawTagChip(st, t.label, t.color, chipX, st.y);
    chipX += w + 2;
  }
  st.y += 7;

  if (p.verTambem.length > 0) {
    writeWrapped(st, `Ver também: ${formatVerTambem(p.verTambem)} (mesmo subtema)`, {
      fontSize: 8.5,
      color: [110, 110, 110],
      lineHeight: 4,
    });
  }

  // Anexos
  if (p.anexos && p.anexos.length > 0) {
    st.y += 2;
    ensureSpace(st, 8);
    writeWrapped(st, `Anexos (${p.anexos.length})`, {
      fontSize: 9.5,
      bold: true,
      color: [120, 90, 20],
      lineHeight: 4.5,
    });
    p.anexos.forEach((a) => {
      ensureSpace(st, 6);
      writeWrapped(st, `• ${a.titulo || a.nome} — ${a.url}`, {
        fontSize: 8.5,
        color: [40, 60, 130],
        lineHeight: 4,
      });
    });
    // Texto extraído de PDFs
    p.anexos
      .filter((a) => a.tipo === 'pdf')
      .forEach((a) => {
        st.y += 2;
        ensureSpace(st, 10);
        writeWrapped(st, `Conteúdo do anexo — ${a.titulo || a.nome}`, {
          fontSize: 9.5,
          bold: true,
          color: [120, 90, 20],
          lineHeight: 4.5,
        });
        if (a.textoExtraido && a.textoExtraido.trim()) {
          writeWrapped(st, a.textoExtraido.trim(), {
            fontSize: 9,
            color: [50, 50, 50],
            lineHeight: 4.3,
            indent: 3,
          });
        } else {
          writeWrapped(
            st,
            a.erroExtracao
              ? `[Não foi possível extrair texto: ${a.erroExtracao}]`
              : '[Não foi possível extrair texto deste anexo]',
            { fontSize: 9, color: [140, 60, 60], lineHeight: 4.3, indent: 3 },
          );
        }
      });
  }

  st.y += 3;
  ensureSpace(st, 4);
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN_X, st.y, PAGE_W - MARGIN_X, st.y);
  st.y += 6;
}

export function exportCadernoPDF(data: CadernoData, filename: string) {
  const prepared = preparePropostasPorEixo(data);
  const total = prepared.reduce((acc, e) => acc + e.propostas.length, 0);
  const st = newPdfState();

  drawCover(st, data.title, 'Caderno de propostas técnicas', total);

  if (prepared.length > 1) {
    drawSummary(st, prepared);
  }

  prepared.forEach(({ eixo, propostas }) => {
    drawEixoHeader(st, eixo, propostas.length);
    propostas.forEach((p) => drawProposta(st, p, eixo));
  });

  drawFooter(st);
  st.pdf.save(filename);
}

// =====================================================================
// DOCX
// =====================================================================

function docxSectionHeading(label: string, text: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [new TextRun({ text: label, bold: true, size: 20, color: '7A5A14' })],
    }),
    ...text
      .split(/\n+/)
      .filter((l) => l.trim())
      .map(
        (line) =>
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: line.trim(), size: 22 })],
          }),
      ),
  ];
}

function docxTagsLine(eixoNome: string, temaNome: string | null, subtemaNome: string | null): Paragraph {
  const runs: TextRun[] = [];
  const eixoColor = (EIXO_HEX_COLORS[eixoNome] ?? '#64748B').replace('#', '');
  runs.push(
    new TextRun({ text: ` ${eixoNome} `, bold: true, size: 16, color: 'FFFFFF', shading: { fill: eixoColor, type: 'clear', color: 'auto' } as any }),
    new TextRun({ text: '  ', size: 16 }),
  );
  if (temaNome) {
    runs.push(
      new TextRun({ text: ` Tema: ${temaNome} `, bold: true, size: 16, color: 'FFFFFF', shading: { fill: '475569', type: 'clear', color: 'auto' } as any }),
      new TextRun({ text: '  ', size: 16 }),
    );
  }
  if (subtemaNome) {
    runs.push(
      new TextRun({ text: ` Subtema: ${subtemaNome} `, bold: true, size: 16, color: 'FFFFFF', shading: { fill: '64748B', type: 'clear', color: 'auto' } as any }),
    );
  }
  return new Paragraph({ spacing: { before: 80, after: 40 }, children: runs });
}

function docxPropostaBlock(p: PreparedProposta, eixo: CadernoEixo): Paragraph[] {
  const blocks: Paragraph[] = [];
  const statusHex = STATUS_COLOR_HEX[p.status] ?? '94A3B8';
  const statusLabel = STATUS_LABEL[p.status] ?? p.status;

  blocks.push(
    new Paragraph({
      spacing: { before: 200, after: 40 },
      children: [
        new TextRun({ text: `#${p.numero} `, bold: true, size: 26, color: BRAND_GOLD_HEX }),
        new TextRun({ text: p.titulo, bold: true, size: 26, color: BRAND_DARK_HEX }),
        new TextRun({ text: '   ' }),
        new TextRun({
          text: ` ${statusLabel} `,
          bold: true,
          size: 16,
          color: 'FFFFFF',
          shading: { fill: statusHex, type: 'clear', color: 'auto' } as any,
        }),
      ],
    }),
  );

  const metaParts: string[] = [];
  if (p.autor_nome) metaParts.push(`Autor: ${p.autor_nome}`);
  metaParts.push(`Município: ${p.municipio_nome ?? 'Estadual'}`);
  if (p.etapa != null) metaParts.push(`Etapa: ${p.etapa}/3`);
  blocks.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: metaParts.join('  ·  '), italics: true, size: 18, color: '6E6E6E' })],
    }),
  );

  const sections: Array<{ label: string; text: string | null }> = [
    { label: 'Descrição', text: p.descricao },
    { label: 'Metas', text: p.metas },
    { label: 'Indicadores', text: p.indicadores },
  ];
  for (const s of sections) {
    if (!s.text || !s.text.trim()) continue;
    blocks.push(...docxSectionHeading(s.label, s.text));
  }

  blocks.push(docxTagsLine(eixo.nome, p.tema_nome, p.subtema_nome));

  if (p.verTambem.length > 0) {
    blocks.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: `Ver também: ${formatVerTambem(p.verTambem)} (mesmo subtema)`,
            italics: true,
            size: 18,
            color: '6E6E6E',
          }),
        ],
      }),
    );
  }

  if (p.anexos && p.anexos.length > 0) {
    blocks.push(
      new Paragraph({
        spacing: { before: 160, after: 40 },
        children: [
          new TextRun({ text: `Anexos (${p.anexos.length})`, bold: true, size: 20, color: '7A5A14' }),
        ],
      }),
    );
    p.anexos.forEach((a) => {
      blocks.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: '• ', size: 20 }),
            new TextRun({ text: `${a.titulo || a.nome} — `, size: 20 }),
            new ExternalHyperlink({
              link: a.url,
              children: [
                new TextRun({ text: a.url, size: 18, color: '2A4DBD', underline: {} }),
              ],
            }),
          ],
        }),
      );
    });
    p.anexos
      .filter((a) => a.tipo === 'pdf')
      .forEach((a) => {
        blocks.push(
          new Paragraph({
            spacing: { before: 140, after: 40 },
            children: [
              new TextRun({
                text: `Conteúdo do anexo — ${a.titulo || a.nome}`,
                bold: true,
                size: 20,
                color: '7A5A14',
              }),
            ],
          }),
        );
        if (a.textoExtraido && a.textoExtraido.trim()) {
          a.textoExtraido
            .trim()
            .split(/\n+/)
            .filter((l) => l.trim())
            .forEach((line) => {
              blocks.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: line.trim(), size: 20 })],
                }),
              );
            });
        } else {
          blocks.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: a.erroExtracao
                    ? `[Não foi possível extrair texto: ${a.erroExtracao}]`
                    : '[Não foi possível extrair texto deste anexo]',
                  italics: true,
                  size: 18,
                  color: '8A3A3A',
                }),
              ],
            }),
          );
        }
      });
  }

  blocks.push(
    new Paragraph({
      spacing: { before: 80, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 1 } },
      children: [new TextRun({ text: '' })],
    }),
  );

  return blocks;
}

function docxCover(title: string, totalPropostas: number): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 200 },
      children: [new TextRun({ text: 'Juntos Paraná 399', bold: true, size: 56, color: BRAND_DARK_HEX })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: 'Sergio Moro — Pré-candidato ao Governo do Paraná',
          size: 28,
          color: '785A14',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: BRAND_GOLD_HEX, space: 1 } },
      children: [new TextRun({ text: '' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: title, bold: true, size: 44, color: BRAND_DARK_HEX })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'Caderno de propostas técnicas', size: 24, color: '6E6E6E' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: `${totalPropostas} proposta${totalPropostas === 1 ? '' : 's'} · Gerado em ${todayBR()}`,
          size: 20,
          color: '8A8A8A',
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function docxSummary(prepared: PreparedEixo[]): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: 'Sumário', bold: true, size: 36, color: BRAND_DARK_HEX })],
    }),
  ];
  prepared.forEach(({ eixo, propostas }) => {
    const color = (EIXO_HEX_COLORS[eixo.nome] ?? '#64748B').replace('#', '');
    out.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: '  ', shading: { fill: color, type: 'clear', color: 'auto' } as any }),
          new TextRun({ text: `  ${eixo.ordem}. ${eixo.nome}`, bold: true, size: 22 }),
          new TextRun({
            text: `   —   ${propostas.length} proposta${propostas.length === 1 ? '' : 's'}`,
            size: 20,
            color: '6E6E6E',
          }),
        ],
      }),
    );
  });
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function docxEixoHeader(eixo: CadernoEixo, total: number): Paragraph[] {
  const color = (EIXO_HEX_COLORS[eixo.nome] ?? '#64748B').replace('#', '');
  return [
    new Paragraph({
      spacing: { before: 200, after: 80 },
      shading: { fill: color, type: 'clear', color: 'auto' } as any,
      children: [new TextRun({ text: ` EIXO ${eixo.ordem} `, bold: true, size: 18, color: 'FFFFFF' })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
      children: [new TextRun({ text: eixo.nome, bold: true, size: 36, color: BRAND_DARK_HEX })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND_GOLD_HEX, space: 1 } },
      children: [
        new TextRun({ text: `${total} proposta${total === 1 ? '' : 's'}`, italics: true, size: 18, color: '6E6E6E' }),
      ],
    }),
  ];
}

export async function exportCadernoDOCX(data: CadernoData, filename: string) {
  const prepared = preparePropostasPorEixo(data);
  const total = prepared.reduce((acc, e) => acc + e.propostas.length, 0);

  const children: Paragraph[] = [];
  children.push(...docxCover(data.title, total));
  if (prepared.length > 1) {
    children.push(...docxSummary(prepared));
  }
  prepared.forEach(({ eixo, propostas }, idx) => {
    if (idx > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(...docxEixoHeader(eixo, propostas.length));
    propostas.forEach((p) => {
      children.push(...docxPropostaBlock(p, eixo));
    });
  });

  const doc = new Document({
    creator: 'Juntos Paraná 399',
    title: data.title,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: 'Juntos Paraná 399 · Sergio Moro', size: 16, color: '8A8A8A' })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Página ', size: 16, color: '8A8A8A' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '8A8A8A' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

// =====================================================================
// HELPER: sanitiza nome de arquivo
// =====================================================================

export function slugifyFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
