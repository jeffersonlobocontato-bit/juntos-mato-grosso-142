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
    <section id="mapa" className="py-20 md:py-28 relative overflow-hidden">
      {/* Modern dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(215,35%,12%)] via-[hsl(215,40%,8%)] to-[hsl(215,35%,12%)]" />
      
      {/* Decorative grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Glowing orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary/15 rounded-full blur-[100px]" />
      
      {/* Map silhouette - subtle */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${paranaMap3D})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(0) invert(1)',
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14 md:mb-20"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-secondary text-sm font-semibold mb-6 border border-secondary/30">
            <MapPin className="w-4 h-4" />
            Presença Estadual
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Todos os
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary"> 399 Municípios</span>
          </h2>
          <p className="text-lg md:text-xl text-white/70 leading-relaxed">
            Construindo um plano de governo que representa cada canto do Paraná, 
            com propostas e sugestões de todas as regiões do estado.
          </p>
        </motion.div>

        {/* Cards grid - responsive with glassmorphism */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
          <AnimatePresence mode="popLayout">
            {displayedCities.map((city, index) => {
              const stats = getRandomStats();
              const isLeftSide = index < 3;
              const accentColor = isLeftSide ? 'primary' : 'secondary';
              
              return (
                <motion.div
                  key={`city-${city}-${index}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.06, type: "spring", stiffness: 200 }}
                  className="group relative"
                >
                  {/* Card glow effect */}
                  <div className={`absolute inset-0 rounded-2xl bg-${accentColor}/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  {/* Card content */}
                  <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${isLeftSide ? 'from-primary/30 to-primary/10' : 'from-secondary/30 to-secondary/10'} border ${isLeftSide ? 'border-primary/30' : 'border-secondary/30'}`}>
                        <MapPin className={`w-5 h-5 ${isLeftSide ? 'text-primary' : 'text-secondary'}`} />
                      </div>
                      <div className="min-w-0 w-full">
                        <h4 className="font-display font-bold text-white text-sm md:text-base truncate mb-2">{city}</h4>
                        <div className="flex justify-center gap-4 text-xs">
                          <span className="flex items-center gap-1.5 text-white/60">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span className="font-semibold text-white">{stats.proposals}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-white/60">
                            <Users className="w-3.5 h-3.5 text-secondary" />
                            <span className="font-semibold text-white">{stats.suggestions}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Counter with accent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-14 md:mt-16"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-[hsl(215,40%,8%)] flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
              ))}
            </div>
            <p className="text-white/70">
              Dados de <span className="font-bold text-white">{municipios.length}</span> municípios paranaenses
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MapSection;
