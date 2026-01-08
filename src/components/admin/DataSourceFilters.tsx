import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, Users, FileText, Database, MapPin, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataFilters {
  // Data sources
  includeSugestoes: boolean;
  includePropostas: boolean;
  includeDocumentos: boolean;
  
  // Location
  regiao: string;
  municipio: string;
  
  // Thematic
  eixo: string;
  
  // Document specific
  docCategory: string;
  temporalStatus: string;
}

interface DataSourceFiltersProps {
  filters: DataFilters;
  onChange: (filters: DataFilters) => void;
  regioes: string[];
  municipios: { id: string; nome: string; regiao: string | null }[];
  eixos: { id: string; nome: string }[];
  className?: string;
}

const DOC_CATEGORIES = [
  { value: 'plano_governo', label: 'Plano de Governo' },
  { value: 'documento_tecnico', label: 'Documento Técnico' },
  { value: 'noticia', label: 'Notícia/Publicação' },
  { value: 'comprovacao', label: 'Comprovação de Obra' },
  { value: 'investimento', label: 'Documento de Investimento' },
  { value: 'promessa', label: 'Promessa/Compromisso' },
  { value: 'legislacao', label: 'Legislação' },
  { value: 'outro', label: 'Outro' },
];

const TEMPORAL_STATUS = [
  { value: 'realizado', label: 'Realizado', color: 'bg-green-500' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-yellow-500' },
  { value: 'prometido', label: 'Prometido', color: 'bg-blue-500' },
  { value: 'nao_iniciado', label: 'Não Iniciado', color: 'bg-gray-500' },
];

export function DataSourceFilters({ 
  filters, 
  onChange, 
  regioes, 
  municipios, 
  eixos,
  className 
}: DataSourceFiltersProps) {
  const updateFilter = <K extends keyof DataFilters>(key: K, value: DataFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const filteredMunicipios = filters.regiao 
    ? municipios.filter(m => m.regiao === filters.regiao)
    : municipios;

  const activeSourcesCount = [
    filters.includeSugestoes, 
    filters.includePropostas, 
    filters.includeDocumentos
  ].filter(Boolean).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Filtros de Dados
          </span>
          <Badge variant="secondary" className="text-xs">
            {activeSourcesCount} fonte{activeSourcesCount !== 1 ? 's' : ''} ativa{activeSourcesCount !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Sources */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Database className="w-4 h-4" />
            Origem dos Dados
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              filters.includeSugestoes ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            )}>
              <Checkbox 
                checked={filters.includeSugestoes}
                onCheckedChange={(checked) => updateFilter('includeSugestoes', !!checked)}
              />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">Sugestões Populares</div>
                  <div className="text-xs text-muted-foreground">Demandas da população</div>
                </div>
              </div>
            </label>

            <label className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              filters.includePropostas ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            )}>
              <Checkbox 
                checked={filters.includePropostas}
                onCheckedChange={(checked) => updateFilter('includePropostas', !!checked)}
              />
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Propostas Técnicas</div>
                  <div className="text-xs text-muted-foreground">Propostas dos especialistas</div>
                </div>
              </div>
            </label>

            <label className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              filters.includeDocumentos ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            )}>
              <Checkbox 
                checked={filters.includeDocumentos}
                onCheckedChange={(checked) => updateFilter('includeDocumentos', !!checked)}
              />
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-sm font-medium">Documentos da Base</div>
                  <div className="text-xs text-muted-foreground">Arquivos carregados na IA</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Location Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Região
            </Label>
            <Select 
              value={filters.regiao || "__all__"} 
              onValueChange={(v) => {
                updateFilter('regiao', v === "__all__" ? "" : v);
                if (v === "__all__" || v !== filters.regiao) {
                  updateFilter('municipio', "");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as regiões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as regiões</SelectItem>
                {regioes.map(regiao => (
                  <SelectItem key={regiao} value={regiao}>{regiao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Município
            </Label>
            <Select 
              value={filters.municipio || "__all__"} 
              onValueChange={(v) => updateFilter('municipio', v === "__all__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os municípios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os municípios</SelectItem>
                {filteredMunicipios.map(m => (
                  <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Target className="w-3.5 h-3.5" />
              Eixo Temático
            </Label>
            <Select 
              value={filters.eixo || "__all__"} 
              onValueChange={(v) => updateFilter('eixo', v === "__all__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os eixos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os eixos</SelectItem>
                {eixos.map(eixo => (
                  <SelectItem key={eixo.id} value={eixo.nome}>{eixo.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Document-specific Filters (only when documents are included) */}
        {filters.includeDocumentos && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Tipo de Documento
              </Label>
              <Select 
                value={filters.docCategory || "__all__"} 
                onValueChange={(v) => updateFilter('docCategory', v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os tipos</SelectItem>
                  {DOC_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Status Temporal
              </Label>
              <Select 
                value={filters.temporalStatus || "__all__"} 
                onValueChange={(v) => updateFilter('temporalStatus', v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os status</SelectItem>
                  {TEMPORAL_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', status.color)} />
                        {status.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DataSourceFilters;
