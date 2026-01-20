import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FileText, BookOpen, Users, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatsData {
  totalPropostas: number;
  propostasPublicadas: number;
  autoresUnicos: number;
  eixosComPropostas: number;
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

const LiderancasStats = () => {
  const [stats, setStats] = useState<StatsData>({
    totalPropostas: 0,
    propostasPublicadas: 0,
    autoresUnicos: 0,
    eixosComPropostas: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch total proposals count
      const { count: totalCount } = await supabase
        .from("propostas_politicas")
        .select("*", { count: "exact", head: true });

      // Fetch published proposals count
      const { count: publicadasCount } = await supabase
        .from("propostas_politicas")
        .select("*", { count: "exact", head: true })
        .eq("status", "publicada");

      // Fetch unique authors
      const { data: autoresData } = await supabase
        .from("propostas_politicas")
        .select("autor_id");
      
      const uniqueAutores = new Set(autoresData?.map(p => p.autor_id) || []).size;

      // Fetch unique eixos with proposals
      const { data: eixosData } = await supabase
        .from("propostas_politicas")
        .select("eixo_id")
        .not("eixo_id", "is", null);
      
      const uniqueEixos = new Set(eixosData?.map(p => p.eixo_id) || []).size;

      setStats({
        totalPropostas: totalCount || 0,
        propostasPublicadas: publicadasCount || 0,
        autoresUnicos: uniqueAutores,
        eixosComPropostas: uniqueEixos,
      });
    };

    fetchStats();
  }, []);

  const statsConfig = [
    {
      icon: FileText,
      value: stats.totalPropostas,
      label: "Propostas Políticas",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: BookOpen,
      value: stats.propostasPublicadas,
      label: "Propostas Publicadas",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Users,
      value: stats.autoresUnicos,
      label: "Lideranças Engajadas",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Layers,
      value: stats.eixosComPropostas,
      label: "Eixos com Propostas",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <section id="dashboard" className="py-16 bg-gradient-to-b from-background to-muted/30">
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
            Impacto das Contribuições
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

export default LiderancasStats;
