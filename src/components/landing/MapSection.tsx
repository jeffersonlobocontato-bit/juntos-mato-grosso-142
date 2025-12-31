import { motion } from "framer-motion";
import { MapPin, Users, FileText } from "lucide-react";
import paranaMap from "@/assets/parana-map.png";

// Sample data for demonstration
const regions = [
  { name: "Curitiba", proposals: 45, suggestions: 234, x: 75, y: 70 },
  { name: "Londrina", proposals: 32, suggestions: 156, x: 50, y: 25 },
  { name: "Maringá", proposals: 28, suggestions: 142, x: 40, y: 30 },
  { name: "Cascavel", proposals: 24, suggestions: 98, x: 15, y: 50 },
  { name: "Foz do Iguaçu", proposals: 18, suggestions: 87, x: 5, y: 75 },
  { name: "Ponta Grossa", proposals: 22, suggestions: 112, x: 65, y: 55 },
];

const MapSection = () => {
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
            Mapa Interativo
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Propostas por
            <span className="text-secondary"> Município</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Visualize a distribuição das propostas técnicas e sugestões populares 
            em todo o território paranaense.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 items-center">
          {/* Stats sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {regions.slice(0, 3).map((region, index) => (
              <div
                key={region.name}
                className="bg-card rounded-xl p-4 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)] transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-foreground">{region.name}</h4>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {region.proposals}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {region.suggestions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative lg:col-span-1 aspect-square"
          >
            <div className="relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-secondary/5 to-primary/5 p-8">
              <img
                src={paranaMap}
                alt="Mapa do Paraná"
                className="w-full h-full object-contain opacity-80"
              />
              
              {/* Map markers */}
              {regions.map((region, index) => (
                <motion.div
                  key={region.name}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  className="absolute group cursor-pointer"
                  style={{ left: `${region.x}%`, top: `${region.y}%` }}
                >
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-primary border-2 border-background shadow-[0_0_20px_hsl(152_60%_28%_/_0.4)] animate-pulse" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-foreground text-background text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
                        {region.name}: {region.proposals + region.suggestions}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stats sidebar right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {regions.slice(3).map((region, index) => (
              <div
                key={region.name}
                className="bg-card rounded-xl p-4 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)] transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-foreground">{region.name}</h4>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {region.proposals}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {region.suggestions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
