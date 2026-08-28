import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Eye, EyeOff, RefreshCw, MessageCircle } from 'lucide-react';

interface IngestLog {
  id: string;
  external_id: string | null;
  status: string;
  erro: string | null;
  sugestao_id: string | null;
  payload: any;
  created_at: string;
}

const exemploPayload = `{
  "external_id": "conversa-12345",
  "nome": "Maria Silva",
  "whatsapp": "65999998888",
  "municipio": "Cuiabá",
  "descricao": "Precisamos de mais creches no bairro.",
  "email": "maria@exemplo.com",
  "eixo": "Desenvolvimento Social"
}`;

export default function AdminWhatsApp() {
  const [config, setConfig] = useState<{ endpoint: string; token: string } | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [logs, setLogs] = useState<IngestLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    const { data, error } = await supabase.functions.invoke('whatsapp-ingest?config=1', {
      method: 'GET',
    });
    if (error) {
      toast.error('Não foi possível carregar o token de integração.');
      return;
    }
    setConfig(data as { endpoint: string; token: string });
  };

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_ingest_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data ?? []) as IngestLog[]);
    setLoading(false);
  };

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  };

  const aceitos = logs.filter((l) => l.status === 'aceito').length;
  const rejeitados = logs.length - aceitos;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" /> Integração WhatsApp
          </h1>
        </div>

        <Card>
          <CardHeader><CardTitle>Dados para o fornecedor</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              O fornecedor homologado conduz a conversa no WhatsApp e, ao final, envia a sugestão
              para o endpoint abaixo. Cada envio gera automaticamente uma sugestão popular e um lead.
            </p>

            <div className="space-y-1">
              <div className="font-medium">Endpoint (POST)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted p-2">{config?.endpoint ?? '—'}</code>
                {config && (
                  <Button size="icon" variant="outline" onClick={() => copy(config.endpoint, 'Endpoint')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-medium">Header de autenticação</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted p-2">
                  X-Ingest-Token: {config ? (showToken ? config.token : '••••••••••••••••••••') : '—'}
                </code>
                <Button size="icon" variant="outline" onClick={() => setShowToken((v) => !v)}>
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {config && (
                  <Button size="icon" variant="outline" onClick={() => copy(config.token, 'Token')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-medium">Corpo do envio (JSON)</div>
              <pre className="rounded bg-muted p-3 overflow-x-auto text-xs">{exemploPayload}</pre>
              <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                <li><strong>Obrigatórios:</strong> nome, whatsapp, municipio, descricao.</li>
                <li><strong>Opcionais:</strong> email, eixo, external_id (evita duplicidade em reenvio).</li>
                <li>O município deve existir na base do estado; caso contrário o envio é recusado.</li>
                <li>Sem o campo <code>eixo</code>, a classificação temática é feita por IA.</li>
              </ul>
            </div>

            <div className="space-y-1">
              <div className="font-medium">Respostas</div>
              <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                <li><code>200</code> — <code>{'{ "ok": true, "sugestao_id": "..." }'}</code></li>
                <li><code>400</code> — dados inválidos, com o motivo em <code>error</code></li>
                <li><code>401</code> — token inválido</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              Últimos recebimentos
              <Badge variant="secondary">{aceitos} aceitos</Badge>
              {rejeitados > 0 && <Badge variant="destructive">{rejeitados} rejeitados</Badge>}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum envio recebido ainda.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="rounded border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.status === 'aceito' ? 'secondary' : 'destructive'}>
                          {log.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {log.external_id ?? 'sem external_id'}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {log.erro && <p className="mt-2 text-destructive">{log.erro}</p>}
                    <p className="mt-1 text-muted-foreground line-clamp-2">
                      {log.payload?.nome ? `${log.payload.nome} — ` : ''}
                      {log.payload?.descricao ?? ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
