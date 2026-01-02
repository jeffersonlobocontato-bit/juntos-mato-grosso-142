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
import AnalyticsTracker from "@/components/landing/AnalyticsTracker";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnalyticsTracker />
      <Header />
      <main>
        <div data-component="HeroSection"><HeroSection /></div>
        <div data-component="AboutSection"><AboutSection /></div>
        <div data-component="MapSection"><MapSection /></div>
        <div data-component="StatsSection"><StatsSection /></div>
        <div data-component="SocialEngagementSection"><SocialEngagementSection /></div>
        <div data-component="SuggestionForm"><SuggestionForm /></div>
      </main>
      <div data-component="Footer"><Footer /></div>
      <div data-component="ChatBot"><ChatBot /></div>
      <div data-component="FloatingShareButton"><FloatingShareButton /></div>
    </div>
  );
};

export default Index;
