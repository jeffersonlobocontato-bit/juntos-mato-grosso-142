import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import MapSection from "@/components/landing/MapSection";
import StatsSection from "@/components/landing/StatsSection";
import SocialEngagementSection from "@/components/landing/SocialEngagementSection";
import SuggestionForm from "@/components/landing/SuggestionForm";
import Footer from "@/components/landing/Footer";
import ChatBot from "@/components/landing/ChatBot";
import FloatingShareButton from "@/components/landing/FloatingShareButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <MapSection />
        <StatsSection />
        <SocialEngagementSection />
        <SuggestionForm />
      </main>
      <Footer />
      <ChatBot />
      <FloatingShareButton />
    </div>
  );
};

export default Index;