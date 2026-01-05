import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Target, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  created_at: string;
}

interface RecentActivityFeedProps {
  propostas: ActivityItem[];
  sugestoes: ActivityItem[];
  leads: ActivityItem[];
  isLoading?: boolean;
}

function ActivityList({ items, icon: Icon, emptyMessage }: { 
  items: ActivityItem[]; 
  icon: React.ElementType;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentActivityFeed({
  propostas,
  sugestoes,
  leads,
  isLoading = false,
}: RecentActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="propostas" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="propostas" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Propostas
            </TabsTrigger>
            <TabsTrigger value="sugestoes" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Sugestões
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Leads
            </TabsTrigger>
          </TabsList>
          <TabsContent value="propostas">
            <ActivityList 
              items={propostas} 
              icon={FileText} 
              emptyMessage="Nenhuma proposta recente"
            />
          </TabsContent>
          <TabsContent value="sugestoes">
            <ActivityList 
              items={sugestoes} 
              icon={Users} 
              emptyMessage="Nenhuma sugestão recente"
            />
          </TabsContent>
          <TabsContent value="leads">
            <ActivityList 
              items={leads} 
              icon={Target} 
              emptyMessage="Nenhum lead recente"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
