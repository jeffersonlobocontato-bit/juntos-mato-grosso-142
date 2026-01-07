import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProposalTimechip } from './ProposalTimechip';
import { ProposalStatusEditor } from './ProposalStatusEditor';
import { AlertTriangle, ChevronRight, Layers, MapPin, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaleProposal {
  id: string;
  titulo: string;
  status: string;
  etapa: number;
  eixo_nome?: string;
  municipio_nome?: string;
  updated_at: string;
  hours_stale?: number;
}

interface StaleProposalsAlertPanelProps {
  proposals: StaleProposal[];
  isLoading?: boolean;
  onRefresh?: () => void;
  maxHeight?: string;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  validada: 'Validada',
  consolidada: 'Consolidada',
  aprovada: 'Aprovada',
};

export const StaleProposalsAlertPanel = ({
  proposals,
  isLoading = false,
  onRefresh,
  maxHeight = '400px',
}: StaleProposalsAlertPanelProps) => {
  const [selectedProposal, setSelectedProposal] = useState<StaleProposal | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Filter and sort proposals by hours stale
  const sortedProposals = [...proposals]
    .filter((p) => {
      const hoursStale = p.hours_stale ?? 
        Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60));
      return hoursStale >= 24; // Only show at-risk and overdue
    })
    .sort((a, b) => {
      const hoursA = a.hours_stale ?? 
        Math.floor((Date.now() - new Date(a.updated_at).getTime()) / (1000 * 60 * 60));
      const hoursB = b.hours_stale ?? 
        Math.floor((Date.now() - new Date(b.updated_at).getTime()) / (1000 * 60 * 60));
      return hoursB - hoursA;
    });

  const overdueCount = sortedProposals.filter((p) => {
    const hoursStale = p.hours_stale ?? 
      Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60));
    return hoursStale >= 48;
  }).length;

  const atRiskCount = sortedProposals.length - overdueCount;

  const handleEdit = (proposal: StaleProposal) => {
    setSelectedProposal(proposal);
    setEditorOpen(true);
  };

  const handleEditorSuccess = () => {
    setEditorOpen(false);
    setSelectedProposal(null);
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Propostas Aguardando Ação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedProposals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            Propostas Aguardando Ação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            ✓ Todas as propostas estão em dia!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className={cn(
                'h-5 w-5',
                overdueCount > 0 ? 'text-red-500' : 'text-yellow-500'
              )} />
              Propostas Aguardando Ação
            </CardTitle>
            <div className="flex gap-2">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                </Badge>
              )}
              {atRiskCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  {atRiskCount} em risco
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea style={{ maxHeight }}>
            <div className="divide-y">
              {sortedProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <ProposalTimechip updatedAt={proposal.updated_at} size="sm" />
                      <span className="text-sm font-medium truncate">{proposal.titulo}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {proposal.eixo_nome && (
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {proposal.eixo_nome}
                        </span>
                      )}
                      {proposal.municipio_nome && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {proposal.municipio_nome}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[proposal.status] || proposal.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 shrink-0"
                    onClick={() => handleEdit(proposal)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ProposalStatusEditor
        proposal={selectedProposal}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSuccess={handleEditorSuccess}
      />
    </>
  );
};
