import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles, Shield } from "lucide-react";
import sergioMoro from "@/assets/sergio-moro.jpg";

const EntrevistaHero = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Área Exclusiva - Líderes Técnicos
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 leading-tight"
            >
              Rota 399:
              <br />
              <span className="text-primary">Entrevista Técnica</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg md:text-xl text-muted-foreground max-w-lg mb-8 leading-relaxed"
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
                className="group"
              >
                <span>Iniciar Entrevista</span>
                <Sparkles className="w-5 h-5 ml-2 transition-transform group-hover:rotate-12" />
              </Button>
              <Button
                onClick={() => scrollToSection("sobre-entrevista")}
                variant="outline"
                size="xl"
              >
                Sobre a Iniciativa
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Content - Ambassador Photo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative aspect-[3/4] max-w-md mx-auto lg:ml-auto">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-transparent rounded-3xl blur-2xl transform scale-105" />
              
              {/* Photo Container */}
              <div className="relative h-full rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                <img
                  src={sergioMoro}
                  alt="Senador Sergio Moro - Embaixador da Iniciativa"
                  className="w-full h-full object-cover object-top"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                
                {/* Name Tag */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="absolute bottom-0 left-0 right-0 p-6"
                >
                  <div className="bg-background/20 backdrop-blur-md rounded-2xl p-4 border border-background/20">
                    <h3 className="font-display font-bold text-xl text-primary-foreground">
                      Senador Sergio Moro
                    </h3>
                    <p className="text-primary-foreground/80 text-sm">
                      Embaixador da Iniciativa Rota 399
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border-2 border-primary/30 rounded-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 border-2 border-accent/30 rounded-full" />
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
          className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-xs font-medium uppercase tracking-wider">Explore</span>
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </section>
  );
};

export default EntrevistaHero;
