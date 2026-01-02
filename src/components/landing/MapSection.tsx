import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, FileText } from "lucide-react";
import { useState, useEffect, forwardRef } from "react";
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
    <section id="mapa" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background with gradient and map */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(${paranaMap3D})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
            Presença Estadual
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Todos os
            <span className="text-secondary"> 399 Municípios</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            Construindo um plano de governo que representa cada canto do Paraná, 
            com propostas e sugestões de todas as regiões do estado.
          </p>
        </motion.div>

        {/* Cards grid - responsive */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <AnimatePresence mode="wait">
            {displayedCities.map((city, index) => {
              const stats = getRandomStats();
              const isLeftSide = index < 3;
              
              return (
                <motion.div
                  key={`city-${city}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-card/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)]"
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${isLeftSide ? 'bg-primary/10' : 'bg-secondary/10'}`}>
                      <MapPin className={`w-4 h-4 md:w-5 md:h-5 ${isLeftSide ? 'text-primary' : 'text-secondary'}`} />
                    </div>
                    <div className="min-w-0 w-full">
                      <h4 className="font-display font-bold text-foreground text-xs md:text-sm truncate">{city}</h4>
                      <div className="flex justify-center gap-3 text-xs text-muted-foreground mt-1">
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

        {/* Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-10 md:mt-12"
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
