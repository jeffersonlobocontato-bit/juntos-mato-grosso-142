import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { FileText, Users, MapPin, Target } from "lucide-react";

const stats = [
  {
    icon: FileText,
    value: 847,
    label: "Propostas Técnicas",
    color: "primary",
  },
  {
    icon: Users,
    value: 3254,
    label: "Sugestões Populares",
    color: "secondary",
  },
  {
    icon: MapPin,
    value: 267,
    label: "Municípios Participantes",
    suffix: "/399",
    color: "accent",
  },
  {
    icon: Target,
    value: 12,
    label: "Eixos Temáticos",
    color: "primary",
  },
];

const CountUp = ({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isInView]);

  return (
    <span ref={ref}>
      {count.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
};

const StatsSection = () => {
  return (
    <section id="indicadores" className="py-24 bg-gradient-to-br from-primary via-primary to-primary/90 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-semibold mb-4 backdrop-blur-sm">
            Dashboard Público
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Indicadores em
            <span className="text-accent"> Tempo Real</span>
          </h2>
          <p className="text-lg text-primary-foreground/80">
            Acompanhe o progresso da construção colaborativa do Plano de Governo.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-8 border border-primary-foreground/20 hover:bg-primary-foreground/15 transition-all hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-2xl ${stat.color === "accent" ? "bg-accent/20" : "bg-primary-foreground/20"} flex items-center justify-center mb-6`}>
                <stat.icon className={`w-7 h-7 ${stat.color === "accent" ? "text-accent" : "text-primary-foreground"}`} />
              </div>
              <div className="font-display text-4xl md:text-5xl font-black text-primary-foreground mb-2">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-primary-foreground/70 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
