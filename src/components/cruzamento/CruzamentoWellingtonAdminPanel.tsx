// Portado do módulo "Cruzamento Moro" da plataforma Politiza IA (politiza.ia.br)
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface AccessRow {
  id: string;
  user_id: string;
  email: string;
  granted_by: string | null;
  created_at: string;
}

async function callFn(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await (supabase as any).functions.invoke('manage-cruzamento-wellington-access', {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message || 'Erro na função');
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function CruzamentoWellingtonAdminPanel() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const listQuery = useQuery({
    queryKey: ['cruzamento-wellington-access-list'],
    queryFn: async () => {
      const data = await callFn('list');
      return (data?.items ?? []) as AccessRow[];
    },
  });

  const createMut = useMutation({
    mutationFn: () => callFn('create', { email, full_name: fullName || null, password }),
    onSuccess: () => {
      toast.success('Acesso concedido');
      setEmail(''); setFullName(''); setPassword('');
      qc.invalidateQueries({ queryKey: ['cruzamento-wellington-access-list'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao conceder acesso'),
  });

  const revokeMut = useMutation({
    mutationFn: (user_id: string) => callFn('revoke', { user_id }),
    onSuccess: () => {
      toast.success('Acesso revogado');
      qc.invalidateQueries({ queryKey: ['cruzamento-wellington-access-list'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao revogar'),
  });

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Controle de Acesso — Cruzamento Wellington
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <Label className="text-xs">E-mail</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@dominio.com" />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Nome</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Senha inicial</Label>
            <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button
              className="w-full gap-2"
              disabled={!email || !password || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              <UserPlus className="w-4 h-4" />
              {createMut.isPending ? 'Concedendo...' : 'Conceder acesso'}
            </Button>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Acessos ativos ({listQuery.data?.length ?? 0})
          </div>
          <div className="border rounded-lg divide-y">
            {listQuery.isLoading && (
              <div className="p-3 text-sm text-muted-foreground">Carregando…</div>
            )}
            {!listQuery.isLoading && (listQuery.data?.length ?? 0) === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Nenhum acesso concedido ainda.</div>
            )}
            {listQuery.data?.map(row => (
              <div key={row.id} className="flex items-center justify-between p-3 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{row.email}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Concedido em {new Date(row.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={revokeMut.isPending}
                  onClick={() => {
                    if (confirm(`Revogar acesso de ${row.email}?`)) revokeMut.mutate(row.user_id);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Revogar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
