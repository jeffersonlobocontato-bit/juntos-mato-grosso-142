import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  PageBreak,
} from "docx";

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────
export interface EntrevistaExportData {
  titulo: string;
  status?: string | null;
  eixoNome?: string | null;
  municipioNome?: string | null;
  entrevistado?: string | null;
  liderNome?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  descricao?: string | null;
  metas?: string | null;
  indicadores?: string | null;
  questionario?: Record<string, unknown> | null;
  eixosMap?: Record<string, string>;
  subtemasMap?: Record<string, string>;
}

interface QA {
  pergunta: string;
  resposta: string;
}

interface Secao {
  titulo: string;
  perguntas: QA[];
}

// ──────────────────────────────────────────────
// Mapeamento das perguntas (alinhado ao EntrevistaForm)
// ──────────────────────────────────────────────
const SECOES_LABELS: Record<string, string> = {
  identificacao: "Identificação",
  aquecimento: "1. Aquecimento",
  o_que_funciona: "2. O que Funciona",
  o_que_nao_funciona: "3. O que Não Funciona",
  parar_substituir: "4. Parar / Substituir",
  governanca: "5. Governança",
  bloco_f: "6. Visão Setorial",
  cocriacao: "7. Cocriação",
};

const PERGUNTAS_LABELS: Record<string, Record<string, string>> = {
  identificacao: {
    entrevistado_email: "E-mail do entrevistado",
    entrevistado_celular: "Celular do entrevistado",
    instituicao_nome: "Razão Social / Instituição",
    instituicao_cnpj: "CNPJ",
    instituicao_segmento: "Segmento da instituição",
    representante_nome: "Nome do representante",
    representante_cargo: "Cargo do representante",
    representante_telefone: "Telefone institucional",
    representante_email: "E-mail corporativo",
    subtemas: "Subtemas selecionados",
  },
  aquecimento: {
    area_atuacao_especifica:
      "A1. Qual é sua área de atuação específica dentro do setor?",
    principais_desafios: "A2. Quais são os 3 principais desafios da sua área hoje?",
  },
  o_que_funciona: {
    acoes_manter:
      "B1. Cite até 3 ações, programas ou práticas que funcionam bem e devem ser mantidas",
    impacto_parar: "B2. Qual seria o impacto se essas ações fossem interrompidas?",
  },
  o_que_nao_funciona: {
    causas_raiz: "C1. Quais são as causas-raiz dos problemas atuais?",
    caso_real: "C2. Cite um caso real que ilustra o problema",
    prioridade_correcao: "C3. Qual seria a prioridade de correção?",
  },
  parar_substituir: {
    rotinas_ineficientes: "D1. Quais rotinas ou práticas ineficientes deveriam ser interrompidas?",
    substituicao_proposta: "D2. Por que substituir essas práticas?",
  },
  governanca: {
    planejamento_vs_anuncio: "E1. Como avalia o equilíbrio entre planejamento de longo prazo e anúncios pontuais?",
    integracao_estado_municipio: "E2. Como aprimorar a integração entre Estado e Municípios?",
  },
  bloco_f: {
    q1: "F1. Pergunta técnica setorial 1",
    q2: "F2. Pergunta técnica setorial 2",
    q3: "F3. Pergunta técnica setorial 3",
    q4: "F4. Pergunta técnica setorial 4",
    q5: "F5. Pergunta técnica setorial 5",
    q6: "F6. Pergunta aberta — visão pessoal para os próximos 4 anos",
  },
  cocriacao: {
    entregas_90_dias: "G1. Quais entregas concretas para os primeiros 90 dias?",
    programa_teste: "G2. Programa-teste sugerido",
    sugestao_cross_eixo: "G3. Sugestão de integração com outros eixos",
    cross_eixo_ids: "G3.b Eixos relacionados",
  },
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Formata valor (string, array, objeto) em texto plano legível. */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const t = value.trim();
    return t.length === 0 ? "—" : t;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const itens = value
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (itens.length === 0) return "—";
    return itens.map((s, i) => `${i + 1}. ${s}`).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `• ${humanizeKey(k)}: ${formatValue(v)}`)
      .join("\n");
  }
  return String(value);
};

const humanizeKey = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

/** Normaliza espaços em branco e remove truncagens sujas. */
const cleanText = (text: string): string =>
  text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

/** Capitaliza primeira letra do texto se estiver em minúsculo. */
const capitalizeFirst = (text: string): string => {
  const t = text.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
};

/** Garante pontuação final em respostas longas. */
const ensurePunctuation = (text: string): string => {
  const t = text.trim();
  if (!t) return t;
  if (/[.!?…)\]”"']$/.test(t)) return t;
  // Não adiciona ponto em respostas curtíssimas (1 palavra)
  if (t.split(/\s+/).length < 3) return t;
  return t + ".";
};

/** Aplica revisão básica gramatical/formatação. */
const reviseAnswer = (raw: string): string => {
  const cleaned = cleanText(raw);
  if (!cleaned || cleaned === "—") return "—";
  return ensurePunctuation(capitalizeFirst(cleaned));
};

/** Resolve UUIDs em arrays específicos antes da formatação. */
const resolveIds = (
  secaoKey: string,
  campo: string,
  valor: unknown,
  eixosMap?: Record<string, string>,
  subtemasMap?: Record<string, string>,
): unknown => {
  if (!Array.isArray(valor)) return valor;
  const isUuidArray = valor.every((v) => typeof v === 'string');
  if (!isUuidArray) return valor;
  if (secaoKey === 'identificacao' && campo === 'subtemas' && subtemasMap) {
    return valor.map((id) => subtemasMap[id as string] || (id as string));
  }
  if (secaoKey === 'cocriacao' && campo === 'cross_eixo_ids' && eixosMap) {
    return valor.map((id) => eixosMap[id as string] || (id as string));
  }
  return valor;
};

/** Constrói as seções de Q&A a partir do questionário. */
const buildSecoes = (
  questionario: Record<string, unknown> | null | undefined,
  eixosMap?: Record<string, string>,
  subtemasMap?: Record<string, string>,
): Secao[] => {
  if (!questionario) return [];
  const secoes: Secao[] = [];

  // Ordem fixa
  const ordem = [
    "identificacao",
    "aquecimento",
    "o_que_funciona",
    "o_que_nao_funciona",
    "parar_substituir",
    "governanca",
    "bloco_f",
    "cocriacao",
  ];

  for (const secaoKey of ordem) {
    const conteudo = questionario[secaoKey];
    if (!conteudo || typeof conteudo !== "object") continue;

    const tituloSecao = SECOES_LABELS[secaoKey] || humanizeKey(secaoKey);
    const labelsSecao = PERGUNTAS_LABELS[secaoKey] || {};
    const perguntas: QA[] = [];

    for (const [campo, rawValor] of Object.entries(conteudo as Record<string, unknown>)) {
      const valor = resolveIds(secaoKey, campo, rawValor, eixosMap, subtemasMap);
      if (valor === null || valor === undefined || valor === "") continue;
      if (Array.isArray(valor) && valor.length === 0) continue;
      if (Array.isArray(valor) && !valor.some((v) => String(v).trim().length > 0)) continue;

      const pergunta = labelsSecao[campo] || humanizeKey(campo);
      const resposta = reviseAnswer(formatValue(valor));
      if (resposta && resposta !== "—") {
        perguntas.push({ pergunta, resposta });
      }
    }

    if (perguntas.length > 0) {
      secoes.push({ titulo: tituloSecao, perguntas });
    }
  }

  // Inclui chaves não-mapeadas (compatibilidade)
  for (const [key, value] of Object.entries(questionario)) {
    if (ordem.includes(key)) continue;
    if (!value) continue;
    const resposta = reviseAnswer(formatValue(value));
    if (resposta && resposta !== "—") {
      secoes.push({
        titulo: humanizeKey(key),
        perguntas: [{ pergunta: humanizeKey(key), resposta }],
      });
    }
  }

  return secoes;
};

const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const buildResumoExecutivo = (data: EntrevistaExportData): string => {
  const partes: string[] = [];
  if (data.entrevistado) partes.push(`Entrevistado(a): ${data.entrevistado}`);
  if (data.liderNome) partes.push(`Entrevistador/Líder: ${data.liderNome}`);
  if (data.eixoNome) partes.push(`Eixo Temático: ${data.eixoNome}`);
  if (data.municipioNome) partes.push(`Município de referência: ${data.municipioNome}`);
  if (data.status) partes.push(`Status: ${data.status}`);
  if (data.createdAt) partes.push(`Realizada em: ${formatDate(data.createdAt)}`);
  return partes.join(" • ");
};

// ──────────────────────────────────────────────
// PDF Export
// ──────────────────────────────────────────────
export const exportEntrevistaPDF = (data: EntrevistaExportData) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;

  let y = marginTop;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  const writeWrapped = (text: string, fontSize: number, lineGap = 4, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = fontSize * 1.25;
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX, y);
      y += lineHeight;
    }
    y += lineGap;
  };

  // Header / Título
  doc.setFillColor(13, 71, 161); // azul institucional
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ENTREVISTA TÉCNICA — JUNTOS PARANÁ 399", marginX, 22);
  doc.setTextColor(0, 0, 0);

  y = marginTop;

  writeWrapped(cleanText(data.titulo || "Entrevista"), 18, 8, true);

  // Linha divisória
  doc.setDrawColor(13, 71, 161);
  doc.setLineWidth(1.5);
  doc.line(marginX, y, marginX + 80, y);
  y += 14;

  // ── Resumo Executivo ──
  writeWrapped("Resumo Executivo", 13, 6, true);

  const resumoLinhas: Array<[string, string]> = [
    ["Entrevistado(a)", data.entrevistado || "—"],
    ["Entrevistador / Líder", data.liderNome || "—"],
    ["Eixo Temático", data.eixoNome || "—"],
    ["Município de referência", data.municipioNome || "—"],
    ["Status", data.status || "—"],
    ["Data da entrevista", formatDate(data.createdAt)],
    ["Última atualização", formatDate(data.updatedAt)],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const [k, v] of resumoLinhas) {
    const lineHeight = 14;
    ensureSpace(lineHeight);
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, marginX, y);
    doc.setFont("helvetica", "normal");
    const valueLines = doc.splitTextToSize(v, contentWidth - 150) as string[];
    doc.text(valueLines, marginX + 145, y);
    y += Math.max(lineHeight, valueLines.length * 12);
  }
  y += 6;

  if (data.descricao) {
    writeWrapped("Síntese da proposta", 11, 4, true);
    writeWrapped(reviseAnswer(data.descricao), 10, 8);
  }

  if (data.metas) {
    writeWrapped("Metas", 11, 4, true);
    writeWrapped(reviseAnswer(data.metas), 10, 8);
  }

  if (data.indicadores) {
    writeWrapped("Indicadores", 11, 4, true);
    writeWrapped(reviseAnswer(data.indicadores), 10, 8);
  }

  // Separador antes das perguntas
  ensureSpace(20);
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  // ── Perguntas e Respostas ──
  writeWrapped("Perguntas e Respostas", 14, 8, true);

  const secoes = buildSecoes(data.questionario || null);
  if (secoes.length === 0) {
    writeWrapped("Nenhum questionário foi preenchido para esta entrevista.", 10, 4);
  }

  for (const secao of secoes) {
    ensureSpace(28);
    doc.setFillColor(245, 247, 250);
    doc.rect(marginX, y - 12, contentWidth, 22, "F");
    doc.setTextColor(13, 71, 161);
    writeWrapped(secao.titulo, 12, 4, true);
    doc.setTextColor(0, 0, 0);

    for (const qa of secao.perguntas) {
      writeWrapped(qa.pergunta, 10.5, 2, true);
      writeWrapped(qa.resposta, 10, 10);
    }
  }

  // Footer com numeração
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Página ${i} de ${pageCount} — gerado em ${new Date().toLocaleString("pt-BR")}`,
      marginX,
      pageHeight - 24
    );
    doc.text("Juntos Paraná 399", pageWidth - marginX, pageHeight - 24, { align: "right" });
  }

  const fileName = `entrevista-${slugify(data.titulo || "documento")}.pdf`;
  doc.save(fileName);
};

// ──────────────────────────────────────────────
// DOCX Export
// ──────────────────────────────────────────────
export const exportEntrevistaDOCX = async (data: EntrevistaExportData) => {
  const PRIMARY = "0D47A1";

  const heading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) =>
    new Paragraph({
      heading: level,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true, color: PRIMARY })],
    });

  const para = (text: string, opts: { bold?: boolean; size?: number; spacing?: number } = {}) =>
    new Paragraph({
      spacing: { after: opts.spacing ?? 120 },
      children: [
        new TextRun({
          text: cleanText(text),
          bold: opts.bold,
          size: opts.size ?? 22,
        }),
      ],
    });

  const labelValue = (label: string, value: string) =>
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({ text: cleanText(value), size: 22 }),
      ],
    });

  const divider = () =>
    new Paragraph({
      spacing: { before: 120, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "B0BEC5", space: 1 },
      },
      children: [new TextRun("")],
    });

  const children: Paragraph[] = [];

  // Cabeçalho
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "ENTREVISTA TÉCNICA — JUNTOS PARANÁ 399",
          bold: true,
          size: 18,
          color: PRIMARY,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: cleanText(data.titulo || "Entrevista"),
          bold: true,
          size: 32,
        }),
      ],
    })
  );

  children.push(divider());

  // Resumo executivo
  children.push(heading("Resumo Executivo", HeadingLevel.HEADING_1));

  const resumoLinhas: Array<[string, string]> = [
    ["Entrevistado(a)", data.entrevistado || "—"],
    ["Entrevistador / Líder", data.liderNome || "—"],
    ["Eixo Temático", data.eixoNome || "—"],
    ["Município de referência", data.municipioNome || "—"],
    ["Status", data.status || "—"],
    ["Data da entrevista", formatDate(data.createdAt)],
    ["Última atualização", formatDate(data.updatedAt)],
  ];
  for (const [k, v] of resumoLinhas) {
    children.push(labelValue(k, v));
  }

  if (data.descricao) {
    children.push(heading("Síntese da Proposta", HeadingLevel.HEADING_2));
    children.push(para(reviseAnswer(data.descricao)));
  }

  if (data.metas) {
    children.push(heading("Metas", HeadingLevel.HEADING_2));
    children.push(para(reviseAnswer(data.metas)));
  }

  if (data.indicadores) {
    children.push(heading("Indicadores", HeadingLevel.HEADING_2));
    children.push(para(reviseAnswer(data.indicadores)));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Perguntas e respostas
  children.push(heading("Perguntas e Respostas", HeadingLevel.HEADING_1));

  const secoes = buildSecoes(data.questionario || null);
  if (secoes.length === 0) {
    children.push(para("Nenhum questionário foi preenchido para esta entrevista."));
  }

  for (const secao of secoes) {
    children.push(heading(secao.titulo, HeadingLevel.HEADING_2));
    for (const qa of secao.perguntas) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: qa.pergunta, bold: true, size: 22 })],
        })
      );
      // Quebra em parágrafos para preservar listas (\n)
      const linhas = qa.resposta.split(/\n/);
      for (const linha of linhas) {
        if (!linha.trim()) continue;
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: linha, size: 22 })],
          })
        );
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `entrevista-${slugify(data.titulo || "documento")}.docx`;
  saveAs(blob, fileName);
};

// ──────────────────────────────────────────────
const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "entrevista";