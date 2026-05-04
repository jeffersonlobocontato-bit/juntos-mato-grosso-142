import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import DocumentLibrary from '@/components/admin/DocumentLibrary';

const REGIOES = [
  'Centro-Oriental',
  'Centro-Sul',
  'Centro Ocidental',
  'Metropolitana de Curitiba',
  'Noroeste',
  'Norte Central',
  'Norte Pioneiro',
  'Oeste',
  'Sudoeste',
];

const AdminBiblioteca = () => {
  const { user, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();

  const [eixos, setEixos] = useState<{ id: string; nome: string }[]>([]);
  const [municipios, setMunicipios] = useState<
    { id: string; nome: string; regiao: string | null }[]
  >([]);

  const isAuthorized = isAdmin || hasRole('admin_master') || hasRole('lider_tematico');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isAuthorized) {
      navigate('/admin');
    }
  }, [user, authLoading, isAuthorized, navigate]);

  useEffect(() => {
    const load = async () => {
      const [eixosRes, municipiosRes] = await Promise.all([
        supabase.from('eixos_tematicos').select('id, nome').order('nome'),
        supabase.from('municipios').select('id, nome, regiao').order('nome'),
      ]);
      if (eixosRes.data) setEixos(eixosRes.data);
      if (municipiosRes.data) setMunicipios(municipiosRes.data);
    };
    if (user && isAuthorized) load();
  }, [user, isAuthorized]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Painel
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Biblioteca de Documentos</h1>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground mb-4">
          Ambiente exclusivo para gerenciar documentos da plataforma e vinculá-los
          aos agentes/ferramentas de IA correspondentes.
        </p>
        <DocumentLibrary eixos={eixos} municipios={municipios} regioes={REGIOES} />
      </main>
    </div>
  );
};

export default AdminBiblioteca;