import HomeHero from "@/components/landing/home/HomeHero";
import AnalyticsTracker from "@/components/landing/AnalyticsTracker";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnalyticsTracker />
      <main>
        <HomeHero />
      </main>
    </div>
  );
};

export default Index;
