import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { MessageCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BASE_FAKE = 3852;

const CountUp = ({ value, duration = 1500 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const started = useRef(false);

  useEffect(() => {
    if (!isInView) return;
    const from = started.current ? prevRef.current : 0;
    started.current = true;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else prevRef.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, isInView]);

  return <span ref={ref}>{display.toLocaleString("pt-BR")}</span>;
};

const LiveCounterCard = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const [realCount, setRealCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.rpc("get_sugestoes_formulario_count");
      if (!cancelled && typeof data === "number") setRealCount(data);
      else if (!cancelled && data != null) setRealCount(Number(data) || 0);
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const total = BASE_FAKE + realCount;

  const card = (
    <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className={
          embedded
            ? "relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 p-6 md:p-7 shadow-card-float border border-primary/20"
            : "relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 p-8 md:p-12 shadow-card-float border border-primary/20"
        }
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-accent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary-foreground rounded-full blur-3xl" />
        </div>

        <div className={
          embedded
            ? "relative flex items-center gap-4 md:gap-5"
            : "relative grid md:grid-cols-[auto,1fr] gap-6 md:gap-10 items-center"
        }>
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className={
                embedded
                  ? "w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-accent/20 backdrop-blur-sm flex items-center justify-center border border-accent/30"
                  : "w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-accent/20 backdrop-blur-sm flex items-center justify-center border border-accent/30"
              }>
                <MessageCircle className={embedded ? "w-7 h-7 md:w-8 md:h-8 text-accent" : "w-10 h-10 md:w-12 md:h-12 text-accent"} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-accent" />
              </span>
            </div>
          </div>

          <div className={embedded ? "text-left flex-1 min-w-0" : "text-center md:text-left"}>
            <div className={
              embedded
                ? "inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-primary-foreground/90 text-[10px] font-semibold uppercase tracking-wider mb-1"
                : "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-primary-foreground/90 text-xs font-semibold uppercase tracking-wider mb-3"
            }>
              <TrendingUp className="w-3 h-3" />
              Contador ao vivo
            </div>
            <div className={
              embedded
                ? "font-display font-black text-4xl md:text-5xl leading-none text-primary-foreground mb-1.5"
                : "font-display font-black text-5xl md:text-7xl leading-none text-primary-foreground mb-3"
            }>
              <span className="text-accent"><CountUp value={total} /></span>
            </div>
            <p className={
              embedded
                ? "text-primary-foreground/85 text-xs md:text-sm font-medium leading-snug"
                : "text-primary-foreground/85 text-base md:text-lg font-medium max-w-xl"
            }>
              opiniões já recebidas de paranaenses para construir juntos o Plano de Governo.
            </p>
          </div>
        </div>
    </motion.div>
  );

  if (embedded) return card;

  return (
    <section className="relative z-10 container mx-auto px-4 md:px-8 lg:px-12 mt-4">
      {card}
    </section>
  );
};

export default LiveCounterCard;