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

  const CityCard = ({ city, index, side }: { city: string; index: number; side: 'left' | 'right' }) => {
    const stats = getRandomStats();
    const isLeft = side === 'left';
    
    return (
      <motion.div
        key={`${side}-${city}-${index}`}
        initial={{ opacity: 0, x: isLeft ? -20 : 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: isLeft ? -20 : 20, scale: 0.95 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="bg-card rounded-xl p-3 md:p-4 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)]"
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${isLeft ? 'bg-primary/10' : 'bg-secondary/10'}`}>
            <MapPin className={`w-4 h-4 md:w-5 md:h-5 ${isLeft ? 'text-primary' : 'text-secondary'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-bold text-foreground text-sm md:text-base truncate">{city}</h4>
            <div className="flex gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
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
  };

  return (
    <section id="mapa" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
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

        {/* Mobile: Stack layout */}
        <div className="flex flex-col lg:hidden gap-6">
          {/* Map on top for mobile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <img
              src={paranaMap3D}
              alt="Mapa 3D do Paraná"
              className="w-full max-w-md h-auto object-contain drop-shadow-2xl"
            />
          </motion.div>

          {/* Cards in 2-column grid for mobile */}
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {displayedCities.map((city, index) => (
                <CityCard 
                  key={`mobile-${city}-${index}`} 
                  city={city} 
                  index={index} 
                  side={index < 3 ? 'left' : 'right'} 
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop: Three-column layout */}
        <div className="hidden lg:flex items-center justify-center gap-8 xl:gap-12">
          {/* Left sidebar - cities */}
          <div className="w-64 xl:w-72 space-y-4 flex-shrink-0">
            <AnimatePresence mode="popLayout">
              {leftCities.map((city, index) => (
                <CityCard key={`left-${city}-${index}`} city={city} index={index} side="left" />
              ))}
            </AnimatePresence>
          </div>

          {/* 3D Map - free floating */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex-shrink-0"
          >
            <img
              src={paranaMap3D}
              alt="Mapa 3D do Paraná"
              className="w-80 xl:w-96 h-auto object-contain drop-shadow-2xl"
            />
          </motion.div>

          {/* Right sidebar - cities */}
          <div className="w-64 xl:w-72 space-y-4 flex-shrink-0">
            <AnimatePresence mode="popLayout">
              {rightCities.map((city, index) => (
                <CityCard key={`right-${city}-${index}`} city={city} index={index} side="right" />
              ))}
            </AnimatePresence>
          </div>
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
