import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface EixoSummary {
  nome: string;
  propostas: number;
  sugestoes: number;
  aprovadas: number;
  taxaAprovacao: number;
}

interface EixoSummaryTableProps {
  data: EixoSummary[];
  isLoading?: boolean;
}

export function EixoSummaryTable({ data, isLoading = false }: EixoSummaryTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Resumo por Eixo Temático</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => (b.propostas + b.sugestoes) - (a.propostas + a.sugestoes));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Resumo por Eixo Temático</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Eixo</TableHead>
              <TableHead className="text-center">Propostas</TableHead>
              <TableHead className="text-center">Sugestões</TableHead>
              <TableHead className="text-center">Aprovadas</TableHead>
              <TableHead className="text-center">Taxa Aprovação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((eixo) => (
              <TableRow key={eixo.nome}>
                <TableCell className="font-medium max-w-[150px] truncate" title={eixo.nome}>
                  {eixo.nome}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{eixo.propostas}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{eixo.sugestoes}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="default" className="bg-green-600">
                    {eixo.aprovadas}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={eixo.taxaAprovacao} className="h-2 w-16" />
                    <span className="text-sm text-muted-foreground w-12">
                      {eixo.taxaAprovacao.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
