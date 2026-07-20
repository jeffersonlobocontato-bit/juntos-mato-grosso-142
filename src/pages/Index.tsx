import HomeHero from "@/components/landing/home/HomeHero";
import HomeFooter from "@/components/landing/home/HomeFooter";
import LiveCounterCard from "@/components/landing/home/LiveCounterCard";
import AnalyticsTracker from "@/components/landing/AnalyticsTracker";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnalyticsTracker />
      <main>
        <HomeHero />
        <LiveCounterCard />
      </main>
      <HomeFooter />
    </div>
  );
};

export default Index;
