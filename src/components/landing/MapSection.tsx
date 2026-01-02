import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import paranaMap3D from "@/assets/parana-map-3d.png";

const MapSection = () => {
  const [displayedCities, setDisplayedCities] = useState<string[]>([]);

  // Fetch all municipalities from database
  const { data: municipios = [] } = useQuery({
    queryKey: ['municipios-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('municipios')
        .select('nome')
        .order('nome');
      
      if (error) throw error;
      return data.map(m => m.nome);
    },
  });

  // Rotate cities every 3 seconds
  useEffect(() => {
    if (municipios.length === 0) return;

    const getRandomCities = () => {
      const shuffled = [...municipios].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6);
    };

    // Initial set
    setDisplayedCities(getRandomCities());

    const interval = setInterval(() => {
      setDisplayedCities(getRandomCities());
    }, 3000);

    return () => clearInterval(interval);
  }, [municipios]);

  // Generate random stats for visual effect
  const getRandomStats = () => ({
    proposals: Math.floor(Math.random() * 40) + 5,
    suggestions: Math.floor(Math.random() * 200) + 50,
  });

  const leftCities = displayedCities.slice(0, 3);
  const rightCities = displayedCities.slice(3, 6);

  return (
    <section id="mapa" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
            Presença Estadual
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Todos os
            <span className="text-secondary"> 399 Municípios</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Construindo um plano de governo que representa cada canto do Paraná, 
            com propostas e sugestões de todas as regiões do estado.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 items-center">
          {/* Left sidebar - cities */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {leftCities.map((city, index) => {
                const stats = getRandomStats();
                return (
                  <motion.div
                    key={`left-${city}-${index}`}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-card rounded-xl p-4 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-foreground truncate">{city}</h4>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {stats.proposals}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {stats.suggestions}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* 3D Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative lg:col-span-1 aspect-square"
          >
            <div className="relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-secondary/5 to-primary/5 p-8 flex items-center justify-center">
              <img
                src={paranaMap3D}
                alt="Mapa 3D do Paraná"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
              
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            </div>
          </motion.div>

          {/* Right sidebar - cities */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {rightCities.map((city, index) => {
                const stats = getRandomStats();
                return (
                  <motion.div
                    key={`right-${city}-${index}`}
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-card rounded-xl p-4 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-foreground truncate">{city}</h4>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {stats.proposals}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {stats.suggestions}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Dados de <span className="font-bold text-foreground">{municipios.length}</span> municípios paranaenses
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default MapSection;
