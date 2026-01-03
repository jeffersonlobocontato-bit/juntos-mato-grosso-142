import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import EntrevistaHero from "@/components/entrevista/EntrevistaHero";
import EntrevistaAbout from "@/components/entrevista/EntrevistaAbout";
import EntrevistaStats from "@/components/entrevista/EntrevistaStats";
import EntrevistaForm from "@/components/entrevista/EntrevistaForm";
import MapSection from "@/components/landing/MapSection";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Entrevista = () => {
  const { user, isLoading, hasRole, isAdmin } = useAuth();
  const navigate = useNavigate();

  const canAccess = isAdmin || hasRole("lider_tematico");

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            Acesso Restrito
          </h1>
          <p className="text-muted-foreground mb-6">
            Esta área é exclusiva para líderes técnicos e administradores da 
            iniciativa Rota 399.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar à Página Inicial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <EntrevistaHero />
        <EntrevistaAbout />
        <MapSection />
        <EntrevistaStats />
        <EntrevistaForm />
      </main>
      <Footer />
    </div>
  );
};

export default Entrevista;
