import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles, Shield } from "lucide-react";
import sergioMoro from "@/assets/sergio-moro.jpg";
import heroParana from "@/assets/hero-parana.jpg";

const EntrevistaHero = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroParana}
          alt="Paraná"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-emerald-950/30" />
      </div>

      {/* Geometric Graphics */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Diagonal Lines */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-20">
          <div className="absolute top-20 right-20 w-96 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent rotate-45" />
          <div className="absolute top-40 right-10 w-72 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent rotate-45" />
          <div className="absolute top-60 right-32 w-80 h-[2px] bg-gradient-to-r from-transparent via-emerald-600 to-transparent rotate-45" />
        </div>

        {/* Green Glow Orbs */}
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-20 right-40 w-80 h-80 bg-emerald-600/15 rounded-full blur-[120px]"
        />

        {/* Geometric Shapes */}
        <div className="absolute top-1/4 left-10 w-32 h-32 border border-emerald-500/20 rotate-45" />
        <div className="absolute bottom-1/3 left-1/4 w-20 h-20 border border-emerald-400/15 rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-emerald-500/10 rotate-12" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content - Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">
                Área Exclusiva - Líderes Técnicos
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
            >
              Rota 399:
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600">
                Entrevista Técnica
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg md:text-xl text-zinc-400 max-w-lg mb-8 leading-relaxed"
            >
              Registre propostas técnicas diretamente dos especialistas de cada município. 
              Juntos, construímos o Plano de Governo para o Paraná.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                onClick={() => scrollToSection("formulario")}
                size="xl"
                className="group bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              >
                <span>Iniciar Entrevista</span>
                <Sparkles className="w-5 h-5 ml-2 transition-transform group-hover:rotate-12" />
              </Button>
              <Button
                onClick={() => scrollToSection("sobre-entrevista")}
                variant="outline"
                size="xl"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                Sobre a Iniciativa
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Content - Senator Photo with Gradient */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative order-1 lg:order-2"
          >
            <div className="relative aspect-[3/4] max-w-sm mx-auto lg:ml-auto">
              {/* Glow Effect Behind Photo */}
              <motion.div
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-emerald-600/20 to-transparent rounded-2xl blur-2xl transform scale-110"
              />
              
              {/* Photo Container */}
              <div className="relative h-full rounded-2xl overflow-hidden border border-emerald-500/20">
                <img
                  src={sergioMoro}
                  alt="Senador Sergio Moro - Embaixador da Iniciativa"
                  className="w-full h-full object-cover object-top"
                />
                
                {/* Green Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/90 via-emerald-800/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-emerald-500/20" />
                
                {/* Name Tag Integrated */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="absolute bottom-0 left-0 right-0 p-6"
                >
                  <h3 className="font-display font-bold text-2xl text-white mb-1">
                    Senador Sergio Moro
                  </h3>
                  <p className="text-emerald-400 text-sm font-medium">
                    Idealizador da Iniciativa Rota 399 Paraná
                  </p>
                </motion.div>
              </div>

              {/* Decorative Corner Elements */}
              <div className="absolute -top-3 -right-3 w-20 h-20 border-t-2 border-r-2 border-emerald-500/40 rounded-tr-xl" />
              <div className="absolute -bottom-3 -left-3 w-20 h-20 border-b-2 border-l-2 border-emerald-500/40 rounded-bl-xl" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.button
          onClick={() => scrollToSection("sobre-entrevista")}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-emerald-400/70 hover:text-emerald-400 transition-colors"
        >
          <span className="text-xs font-medium uppercase tracking-wider">Explore</span>
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </section>
  );
};

export default EntrevistaHero;
