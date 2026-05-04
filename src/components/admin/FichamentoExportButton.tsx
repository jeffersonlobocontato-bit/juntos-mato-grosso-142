import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  parseFichamento,
  exportFichamentoPDF,
  exportFichamentoDOCX,
} from '@/utils/planoGovernoFichamentoExport';

interface FichamentoExportButtonProps {
  content: string;
  title: string;
  modeLabel?: string;
  filtersSummary?: string;
  size?: 'sm' | 'icon' | 'default';
}

export function FichamentoExportButton({
  content,
  title,
  modeLabel,
  filtersSummary,
  size = 'sm',
}: FichamentoExportButtonProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null);

  const run = async (kind: 'pdf' | 'docx') => {
    if (!content?.trim()) {
      toast({ title: 'Sem conteúdo', description: 'A resposta da IA está vazia.', variant: 'destructive' });
      return;
    }
    setBusy(kind);
    try {
      const { body, sources } = parseFichamento(content);
      const data = {
        title,
        body,
        sources,
        modeLabel,
        filtersSummary,
      };
      if (kind === 'pdf') {
        exportFichamentoPDF(data);
      } else {
        await exportFichamentoDOCX(data);
      }
      toast({
        title: 'Fichamento gerado',
        description: `Arquivo ${kind.toUpperCase()} baixado com ${sources.length} fonte${sources.length !== 1 ? 's' : ''} citada${sources.length !== 1 ? 's' : ''}.`,
      });
    } catch (err) {
      console.error('Erro ao exportar fichamento:', err);
      toast({
        title: 'Erro ao exportar',
        description: err instanceof Error ? err.message : 'Falha ao gerar o documento.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size === 'icon' ? 'icon' : 'sm'}
          title="Exportar como fichamento (PDF ou Word)"
          disabled={busy !== null}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          {size !== 'icon' && <span className="ml-1.5 text-xs">Fichamento</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Exportar fichamento</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run('pdf')} disabled={busy !== null}>
          <FileText className="w-4 h-4 mr-2 text-red-600" />
          Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run('docx')} disabled={busy !== null}>
          <FileText className="w-4 h-4 mr-2 text-blue-600" />
          Baixar Word (.docx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FichamentoExportButton;