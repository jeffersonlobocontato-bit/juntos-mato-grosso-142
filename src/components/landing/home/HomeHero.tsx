import { motion } from "framer-motion";
import OrganicBackground from "./OrganicBackground";
import HeroHeadline from "./HeroHeadline";
import HeroPortrait from "./HeroPortrait";
import OpinionFormCard from "./OpinionFormCard";
import ParticiparAgoraCard from "./ParticiparAgoraCard";

const Logo = () => (
  <div className="inline-flex items-end gap-2 font-display font-black leading-none">
    <span className="text-3xl md:text-4xl">
      <span className="text-primary">Juntos</span>
    </span>
    <span className="text-3xl md:text-4xl">
      <span className="text-primary">Paraná</span>
      <span className="text-accent ml-1">399</span>
    </span>
  </div>
);

const HomeHero = () => {
  return (
    <section className="relative isolate min-h-screen overflow-hidden">
      <OrganicBackground />

      <div className="relative z-10 container mx-auto px-4 md:px-8 lg:px-12 pt-8 md:pt-12 pb-12">
        {/* Top row: logo + portrait area (desktop overlays portrait on right) */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <Logo />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <HeroHeadline />
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <HeroPortrait />
            </motion.div>
          </div>
        </div>

        {/* Form + Sidebar */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 mt-10 lg:mt-12">
          <motion.div
            id="opiniao-form"
            className="lg:col-span-7 scroll-mt-24"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <OpinionFormCard />
          </motion.div>

          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <ParticiparAgoraCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;