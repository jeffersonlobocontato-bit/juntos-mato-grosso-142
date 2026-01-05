import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface MunicipioData {
  nome: string;
  count: number;
}

interface TopMunicipiosCardProps {
  data: MunicipioData[];
  title?: string;
  isLoading?: boolean;
}

export function TopMunicipiosCard({
  data,
  title = "Top Municípios",
  isLoading = false,
}: TopMunicipiosCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-8 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((m) => m.count), 1);
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedData.map((municipio, index) => (
            <div key={municipio.nome} className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground w-5">
                {index + 1}.
              </span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium truncate max-w-[140px]">
                    {municipio.nome}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {municipio.count}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all"
                    style={{ width: `${(municipio.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {sortedData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dado disponível
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
