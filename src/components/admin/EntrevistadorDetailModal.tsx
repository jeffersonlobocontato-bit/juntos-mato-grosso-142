import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "./StatCard";
import { FileText, MapPin, Layers, Users, Building2 } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Proposta {
  id: string;
  titulo: string;
  entrevistado: string | null;
  status: string;
  etapa: number;
  tipo_proposta: string;
  created_at: string;
  eixo_id: string | null;
  eixo_nome?: string;
  tema_nome?: string;
  municipio_nome?: string;
}

interface EntrevistadorDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrevistadorNome: string;
  propostas: Proposta[];
}

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em Análise",
  aprovada: "Aprovada",
};

const statusColors: Record<string, string> = {
  rascunho: "secondary",
  em_analise: "default",
  aprovada: "outline",
};

export function EntrevistadorDetailModal({
  open,
  onOpenChange,
  entrevistadorNome,
  propostas,
}: EntrevistadorDetailModalProps) {
  const stats = useMemo(() => {
    const eixos = new Set(propostas.map(p => p.eixo_nome).filter(Boolean));
    const temas = new Set(propostas.map(p => p.tema_nome).filter(Boolean));
    const municipios = new Set(propostas.map(p => p.municipio_nome).filter(Boolean));
    const entrevistados = new Set(propostas.map(p => p.entrevistado).filter(Boolean));
    const tecnicas = propostas.filter(p => p.tipo_proposta === "tecnica").length;
    const institucionais = propostas.filter(p => p.tipo_proposta === "institucional").length;

    return {
      total: propostas.length,
      eixos: eixos.size,
      temas: temas.size,
      municipios: municipios.size,
      entrevistados: entrevistados.size,
      tecnicas,
      institucionais,
      rascunho: propostas.filter(p => p.status === "rascunho").length,
      em_analise: propostas.filter(p => p.status === "em_analise").length,
      aprovada: propostas.filter(p => p.status === "aprovada").length,
    };
  }, [propostas]);

  const eixoBreakdown = useMemo(() => {
    const map: Record<string, { nome: string; count: number; temas: Set<string>; municipios: Set<string> }> = {};
    propostas.forEach(p => {
      const eixo = p.eixo_nome || "Sem eixo";
      if (!map[eixo]) map[eixo] = { nome: eixo, count: 0, temas: new Set(), municipios: new Set() };
      map[eixo].count++;
      if (p.tema_nome) map[eixo].temas.add(p.tema_nome);
      if (p.municipio_nome) map[eixo].municipios.add(p.municipio_nome);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [propostas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            Detalhes do Entrevistador: {entrevistadorNome}
          </DialogTitle>
        </DialogHeader>

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard title="Total Cadastros" value={stats.total} icon={FileText} variant="primary" />
          <StatCard title="Eixos" value={stats.eixos} icon={Layers} variant="default" />
          <StatCard title="Temas" value={stats.temas} icon={Layers} variant="default" />
          <StatCard title="Municípios" value={stats.municipios} icon={MapPin} variant="success" />
          <StatCard title="Entrevistados" value={stats.entrevistados} icon={Users} variant="warning" />
        </div>

        {/* Status breakdown */}
        <div className="flex gap-3 flex-wrap">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Rascunho: {stats.rascunho}
          </Badge>
          <Badge variant="default" className="text-sm px-3 py-1">
            Em Análise: {stats.em_analise}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Aprovada: {stats.aprovada}
          </Badge>
          {stats.institucionais > 0 && (
            <Badge className="text-sm px-3 py-1 bg-amber-500/20 text-amber-700 border-amber-500/30">
              <Building2 className="w-3 h-3 mr-1" />
              Institucionais: {stats.institucionais}
            </Badge>
          )}
        </div>

        {/* Breakdown por Eixo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição por Eixo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {eixoBreakdown.map(eixo => (
              <div key={eixo.nome} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{eixo.nome}</span>
                  <Badge variant="secondary">{eixo.count} proposta(s)</Badge>
                </div>
                {eixo.temas.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Temas:</span> {Array.from(eixo.temas).join(", ")}
                  </p>
                )}
                {eixo.municipios.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Municípios:</span> {Array.from(eixo.municipios).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tabela de propostas detalhadas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Propostas Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Entrevistado</TableHead>
                    <TableHead>Eixo</TableHead>
                    <TableHead>Tema</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propostas
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{p.entrevistado || "—"}</TableCell>
                        <TableCell className="text-xs">{p.eixo_nome || "—"}</TableCell>
                        <TableCell className="text-xs">{p.tema_nome || "—"}</TableCell>
                        <TableCell className="text-xs">{p.municipio_nome || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusColors[p.status] as any || "secondary"} className="text-xs">
                            {statusLabels[p.status] || p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
