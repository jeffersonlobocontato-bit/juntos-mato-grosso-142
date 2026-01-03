import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FileText, MessageSquare, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatsData {
  totalPropostas: number;
  totalSugestoes: number;
  municipiosAtivos: number;
  totalEixos: number;
}

const CountUp = ({ end, duration = 2 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView]);

  return <span ref={ref}>{count}</span>;
};

const EntrevistaStats = () => {
  const [stats, setStats] = useState<StatsData>({
    totalPropostas: 0,
    totalSugestoes: 0,
    municipiosAtivos: 0,
    totalEixos: 8,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch proposals count
      const { count: propostasCount } = await supabase
        .from("propostas_tecnicas")
        .select("*", { count: "exact", head: true });

      // Fetch suggestions count
      const { count: sugestoesCount } = await supabase
        .from("sugestoes_populares")
        .select("*", { count: "exact", head: true });

      // Fetch unique municipalities with proposals
      const { data: municipiosData } = await supabase
        .from("propostas_tecnicas")
        .select("municipio_id")
        .not("municipio_id", "is", null);
      
      const uniqueMunicipios = new Set(municipiosData?.map(p => p.municipio_id) || []).size;

      // Fetch eixos count
      const { count: eixosCount } = await supabase
        .from("eixos_tematicos")
        .select("*", { count: "exact", head: true });

      setStats({
        totalPropostas: propostasCount || 0,
        totalSugestoes: sugestoesCount || 0,
        municipiosAtivos: uniqueMunicipios,
        totalEixos: eixosCount || 8,
      });
    };

    fetchStats();
  }, []);

  const statsConfig = [
    {
      icon: FileText,
      value: stats.totalPropostas,
      label: "Propostas Técnicas",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: MessageSquare,
      value: stats.totalSugestoes,
      label: "Sugestões Populares",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: MapPin,
      value: stats.municipiosAtivos,
      label: "Municípios Ativos",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Users,
      value: stats.totalEixos,
      label: "Eixos Temáticos",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-3">
            Dashboard em Tempo Real
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Impacto da Iniciativa
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsConfig.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
                <CountUp end={stat.value} />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EntrevistaStats;
