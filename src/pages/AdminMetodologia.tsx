import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import MetodologiaGaleria from "@/components/landing/MetodologiaGaleria";
import MetodologiaDestaqueMidia from "@/components/landing/MetodologiaDestaqueMidia";
import MetodologiaVideo from "@/components/landing/MetodologiaVideo";

const BRAND = { navy: "#013D22", green900: "#00522D", green700: "#007540", green500: "#008544" };

const AdminMetodologia = () => {
  const { user, isLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const isAuthorized = isAdmin || hasRole("admin_master");

  useEffect(() => {
    if (isLoading) return;
    if (!user) navigate("/auth");
    else if (!isAuthorized) navigate("/admin");
  }, [user, isLoading, isAuthorized, navigate]);

  if (isLoading || !user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Conteúdo da LP Metodologia</h1>
            <p className="text-sm text-muted-foreground">
              Galeria do processo, destaques na mídia e capa do vídeo
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-10">
        <MetodologiaGaleria
          brand={{ navy: BRAND.navy, green500: BRAND.green500, green700: BRAND.green700 }}
          manageMode
        />
        <MetodologiaDestaqueMidia
          brand={{ navy: BRAND.navy, green500: BRAND.green500, green700: BRAND.green700 }}
          manageMode
        />
        <MetodologiaVideo
          navy={BRAND.navy}
          green700={BRAND.green700}
          green900={BRAND.green900}
          manageMode
        />
      </div>
    </div>
  );
};

export default AdminMetodologia;
