import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserAccess } from '@/hooks/useUserAccess';
import {
  exportCadernoPDF,
  exportCadernoDOCX,
  slugifyFilename,
  type CadernoEixo,
  type CadernoProposta,
  type CadernoAnexo,
} from '@/utils/cadernoPropostasExport';

type Format = 'pdf' | 'docx';

interface Eixo {
  id: string;
  nome: string;
  ordem: number;
}

interface Props {
  eixos: Eixo[];
}

export function CadernoPropostasExportButton({ eixos }: Props) {
  const [busy, setBusy] = useState(false);
  const { isAdmin, isAdminMaster, canAccessEixo } = useUserAccess();

  const fullAccess = isAdmin || isAdminMaster;
  const visibleEixos = eixos
    .filter((e) => fullAccess || canAccessEixo(e.id))
    .sort((a, b) => a.ordem - b.ordem);

  const fetchData = async (
    eixoId?: string,
  ): Promise<{ eixos: CadernoEixo[]; propostas: CadernoProposta[] }> => {
    // Eixos
    const { data: eixosData, error: eixosErr } = await supabase
      .from('eixos_tematicos')
      .select('id, nome, ordem')
      .order('ordem');
    if (eixosErr) throw eixosErr;
    const eixosFiltered = (eixosData ?? []).filter((e) =>
      eixoId ? e.id === eixoId : true,
    ) as CadernoEixo[];

    // Propostas
    let q = supabase
      .from('propostas_tecnicas')
      .select(
        `id, titulo, descricao, metas, indicadores, status, etapa, anexos,
         eixo_id, tema_id, subtema_id, autor_id, municipio_id,
         eixos_tematicos:eixo_id(nome),
         temas:tema_id(nome),
         subtemas:subtema_id(nome),
         municipios:municipio_id(nome)`,
      )
      .order('titulo');
    if (eixoId) q = q.eq('eixo_id', eixoId);

    const { data: propData, error: propErr } = await q;
    if (propErr) throw propErr;

    const autorIds = Array.from(
      new Set((propData ?? []).map((p: any) => p.autor_id).filter(Boolean)),
    );
    let autorMap = new Map<string, string>();
    if (autorIds.length > 0) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', autorIds);
      autorMap = new Map((profData ?? []).map((pr: any) => [pr.id, pr.full_name ?? '']));
    }

    const propostas: CadernoProposta[] = (propData ?? []).map((p: any) => ({
      id: p.id,
      titulo: p.titulo ?? '(sem título)',
      descricao: p.descricao,
      metas: p.metas,
      indicadores: p.indicadores,
      status: p.status ?? 'rascunho',
      etapa: p.etapa,
      eixo_id: p.eixo_id,
      tema_id: p.tema_id,
      subtema_id: p.subtema_id,
      autor_nome: autorMap.get(p.autor_id) ?? null,
      municipio_nome: p.municipios?.nome ?? null,
      eixo_nome: p.eixos_tematicos?.nome ?? '',
      tema_nome: p.temas?.nome ?? null,
      subtema_nome: p.subtemas?.nome ?? null,
      anexos: parseAnexos(p.anexos),
    }));

    return { eixos: eixosFiltered, propostas };
  };

  const handleExport = async (format: Format, eixo?: Eixo) => {
    if (busy) return;
    setBusy(true);
    const toastId = toast.loading(
      `Gerando ${format.toUpperCase()}${eixo ? ` — ${eixo.nome}` : ' — Caderno completo'}…`,
    );
    try {
      const { eixos: e, propostas } = await fetchData(eixo?.id);
      if (propostas.length === 0) {
        toast.error('Nenhuma proposta encontrada para exportar', { id: toastId });
        return;
      }

      // Extrair texto dos PDFs anexos em paralelo (concorrência 4)
      const pdfTargets: Array<{ proposta: CadernoProposta; anexo: CadernoAnexo }> = [];
      propostas.forEach((p) => {
        (p.anexos ?? []).forEach((a) => {
          if (a.tipo === 'pdf' && a.url) pdfTargets.push({ proposta: p, anexo: a });
        });
      });
      if (pdfTargets.length > 0) {
        let done = 0;
        toast.loading(
          `Extraindo texto dos anexos PDF: 0/${pdfTargets.length}…`,
          { id: toastId },
        );
        const CONCURRENCY = 4;
        let cursor = 0;
        const runWorker = async () => {
          while (cursor < pdfTargets.length) {
            const idx = cursor++;
            const { anexo } = pdfTargets[idx];
            try {
              const { data, error } = await supabase.functions.invoke(
                'extract-pdf-text',
                { body: { url: anexo.url } },
              );
              if (error) throw error;
              if (data?.text) {
                anexo.textoExtraido = data.text;
              } else if (data?.error) {
                anexo.erroExtracao = data.error;
              } else {
                anexo.erroExtracao = 'sem texto extraído';
              }
            } catch (err: any) {
              anexo.erroExtracao = err?.message ?? 'falha na extração';
            } finally {
              done++;
              toast.loading(
                `Extraindo texto dos anexos PDF: ${done}/${pdfTargets.length}…`,
                { id: toastId },
              );
            }
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, pdfTargets.length) }, () => runWorker()),
        );
        toast.loading(
          `Gerando ${format.toUpperCase()}${eixo ? ` — ${eixo.nome}` : ' — Caderno completo'}…`,
          { id: toastId },
        );
      }

      const title = eixo ? eixo.nome : 'Caderno Completo — 5 Eixos Temáticos';
      const baseName = eixo
        ? `caderno-eixo-${eixo.ordem}-${slugifyFilename(eixo.nome)}`
        : 'caderno-completo';
      const filename = `${baseName}.${format}`;

      if (format === 'pdf') {
        exportCadernoPDF({ title, eixos: e, propostas }, filename);
      } else {
        await exportCadernoDOCX({ title, eixos: e, propostas }, filename);
      }
      toast.success(`${format.toUpperCase()} gerado com ${propostas.length} proposta(s)`, {
        id: toastId,
      });
    } catch (err) {
      console.error('Erro ao gerar caderno:', err);
      toast.error('Erro ao gerar caderno. Veja o console.', { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  if (visibleEixos.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {busy ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4 mr-2" />
          )}
          Exportar Caderno
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {fullAccess && (
          <>
            <DropdownMenuLabel>Caderno completo (5 eixos)</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              Baixar PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('docx')}>
              <FileText className="w-4 h-4 mr-2" />
              Baixar Word (.docx)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>Por eixo</DropdownMenuLabel>
        {visibleEixos.map((eixo) => (
          <DropdownMenuSub key={eixo.id}>
            <DropdownMenuSubTrigger>
              <span className="truncate">
                {eixo.ordem}. {eixo.nome}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleExport('pdf', eixo)}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('docx', eixo)}>
                <FileText className="w-4 h-4 mr-2" />
                Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CadernoPropostasExportButton;
