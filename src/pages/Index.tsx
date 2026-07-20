import HomeHero from "@/components/landing/home/HomeHero";
import HomeFooter from "@/components/landing/home/HomeFooter";
import AnalyticsTracker from "@/components/landing/AnalyticsTracker";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnalyticsTracker />
      <main>
        <HomeHero />
      </main>
      <HomeFooter />
    </div>
  );
};

export default Index;
