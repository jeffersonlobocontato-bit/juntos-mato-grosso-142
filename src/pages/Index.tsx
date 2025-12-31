import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import MapSection from "@/components/landing/MapSection";
import StatsSection from "@/components/landing/StatsSection";
import SuggestionForm from "@/components/landing/SuggestionForm";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <MapSection />
        <StatsSection />
        <SuggestionForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
