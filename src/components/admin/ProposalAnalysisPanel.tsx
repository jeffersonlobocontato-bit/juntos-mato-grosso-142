import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ProposalTimechip } from './ProposalTimechip';
import { ProposalStatusEditor } from './ProposalStatusEditor';
import { BarChart3, Filter, Search, Edit2, Eye } from 'lucide-react';

interface Proposal {
  id: string;
  titulo: string;
  status: string;
  etapa: number;
  updated_at: string;
  created_at: string;
  eixo_id: string;
  eixo_nome?: string;
  municipio_id?: string;
  municipio_nome?: string;
  autor_id: string;
}

interface ProposalAnalysisPanelProps {
  proposals: Proposal[];
  eixos: { id: string; nome: string }[];
  municipios: { id: string; nome: string }[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
  em_analise: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  aprovada: 'bg-green-500/20 text-green-700 border-green-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  em_analise: 'Em Análise',
  aprovada: 'Aprovada',
};

export function ProposalAnalysisPanel({
  proposals,
  eixos,
  municipios,
  isLoading = false,
  onRefresh,
}: ProposalAnalysisPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEixo, setSelectedEixo] = useState<string>('__all__');
  const [selectedStatus, setSelectedStatus] = useState<string>('__all__');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('__all__');
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = !searchTerm || 
        p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.eixo_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.municipio_nome?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEixo = selectedEixo === '__all__' || p.eixo_id === selectedEixo;
      const matchesStatus = selectedStatus === '__all__' || p.status === selectedStatus;
      const matchesMunicipio = selectedMunicipio === '__all__' || p.municipio_id === selectedMunicipio;

      return matchesSearch && matchesEixo && matchesStatus && matchesMunicipio;
    });
  }, [proposals, searchTerm, selectedEixo, selectedStatus, selectedMunicipio]);

  // Sort by staleness (most stale first)
  const sortedProposals = useMemo(() => {
    return [...filteredProposals].sort((a, b) => {
      const aTime = new Date(a.updated_at).getTime();
      const bTime = new Date(b.updated_at).getTime();
      return aTime - bTime; // Oldest first (most stale)
    });
  }, [filteredProposals]);

  const stats = useMemo(() => {
    const total = filteredProposals.length;
    const byStatus = filteredProposals.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const now = new Date();
    const stale = filteredProposals.filter(p => {
      const hours = (now.getTime() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60);
      return hours >= 48;
    }).length;

    return { total, byStatus, stale };
  }, [filteredProposals]);

  const handleEditSuccess = () => {
    setEditingProposal(null);
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise de Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Análise de Propostas
            </CardTitle>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">{stats.total} total</Badge>
              {stats.stale > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {stats.stale} atrasadas
                </Badge>
              )}
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <Badge key={status} variant="outline" className={STATUS_COLORS[status]}>
                  {count} {STATUS_LABELS[status]}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, eixo ou município..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedEixo} onValueChange={setSelectedEixo}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Eixo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os Eixos</SelectItem>
                  {eixos.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos Status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedMunicipio} onValueChange={setSelectedMunicipio}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Município" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos Municípios</SelectItem>
                  {municipios.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Título</TableHead>
                  <TableHead>Eixo</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timer</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma proposta encontrada com os filtros selecionados
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProposals.slice(0, 20).map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="line-clamp-1">{proposal.titulo}</span>
                          <span className="text-xs text-muted-foreground">Etapa {proposal.etapa}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{proposal.eixo_nome || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{proposal.municipio_nome || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[proposal.status]}>
                          {STATUS_LABELS[proposal.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ProposalTimechip updatedAt={proposal.updated_at} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {proposal.status !== 'aprovada' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProposal(proposal)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {sortedProposals.length > 20 && (
            <p className="text-sm text-muted-foreground text-center">
              Mostrando 20 de {sortedProposals.length} propostas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status Editor Modal */}
      {editingProposal && (
        <ProposalStatusEditor
          proposal={{
            id: editingProposal.id,
            titulo: editingProposal.titulo,
            status: editingProposal.status as 'rascunho' | 'em_analise' | 'aprovada',
            etapa: editingProposal.etapa,
            eixo_nome: editingProposal.eixo_nome,
            municipio_nome: editingProposal.municipio_nome,
            updated_at: editingProposal.updated_at,
          }}
          open={!!editingProposal}
          onOpenChange={(open) => !open && setEditingProposal(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
