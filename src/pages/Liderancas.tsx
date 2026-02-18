import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import LiderancasHero from "@/components/liderancas/LiderancasHero";
import LiderancasAbout from "@/components/liderancas/LiderancasAbout";
import LiderancasStats from "@/components/liderancas/LiderancasStats";
import LiderancasForm from "@/components/liderancas/LiderancasForm";
import MapSection from "@/components/landing/MapSection";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useEffect } from "react";

const Liderancas = () => {
  const { trackPageview } = useAnalytics();

  useEffect(() => {
    trackPageview();
    // Update page title for SEO
    document.title = "Lideranças | Juntos Paraná 399";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header showSuggestionButton={false} />
      <main>
        <LiderancasHero />
        <LiderancasAbout />
        <MapSection />
        <LiderancasStats />
        <LiderancasForm />
      </main>
      <Footer />
    </div>
  );
};

export default Liderancas;
