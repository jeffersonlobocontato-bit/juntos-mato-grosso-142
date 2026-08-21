// Portado do módulo "Cruzamento Moro" da plataforma Politiza IA (politiza.ia.br)
import { Navigate } from 'react-router-dom';
import { useCruzamentoWellingtonAccess } from '@/hooks/useCruzamentoWellingtonAccess';
import { useAuth } from '@/hooks/useAuth';
import CruzamentoWellingtonAdminPanel from '@/components/cruzamento/CruzamentoWellingtonAdminPanel';
import CruzamentoQualiQuantiWellington from '@/components/cruzamento/CruzamentoQualiQuantiWellington';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

export default function CruzamentoWellingtonPage() {
  const { canAccess, isMaster, cruzamentoOnly, loading } = useCruzamentoWellingtonAccess();
  const { signOut, user } = useAuth();

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verificando acesso…
      </div>
    );
  }
  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {cruzamentoOnly && (
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Acesso exclusivo
            </div>
            <div className="text-sm text-foreground">
              {user?.email}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Cruzamento Wellington</h1>
        <p className="text-sm text-muted-foreground">
          Análise Quali-Quanti restrita — acesso controlado individualmente.
        </p>
      </div>

      {isMaster && <CruzamentoWellingtonAdminPanel />}

      <CruzamentoQualiQuantiWellington />
    </div>
  );
}
