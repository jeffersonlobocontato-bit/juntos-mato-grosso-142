import { motion } from "framer-motion";
import { Users, Target, Eye, Shield } from "lucide-react";

const values = [
  {
    icon: Users,
    title: "Participação",
    description: "Ouça a voz de todos os 399 municípios do Paraná, garantindo representatividade.",
  },
  {
    icon: Target,
    title: "Técnica",
    description: "Propostas embasadas por especialistas e validadas em processo estruturado.",
  },
  {
    icon: Eye,
    title: "Transparência",
    description: "Acompanhe cada etapa do processo de forma aberta e acessível.",
  },
  {
    icon: Shield,
    title: "Compromisso",
    description: "Metas claras e indicadores mensuráveis para o desenvolvimento do Estado.",
  },
];

const AboutSection = () => {
  return (
    <section id="sobre" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Sobre a Iniciativa
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Construindo o Futuro do Paraná
            <span className="text-primary"> Juntos</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A Rota 399 é uma iniciativa popular que percorre todos os municípios 
            paranaenses para coletar propostas técnicas e sugestões da população, 
            construindo colaborativamente um Plano de Governo para o Paraná.
          </p>
        </motion.div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { step: "1", title: "Entrevistas", desc: "Especialistas de cada eixo são ouvidos" },
            { step: "2", title: "Online", desc: "Consulta pública digital" },
            { step: "3", title: "Presencial I", desc: "Debates regionais" },
            { step: "4", title: "Consolidação", desc: "Proposta final validada" },
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_8px_30px_-8px_hsl(215_25%_15%_/_0.12)] transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-[0_0_20px_hsl(152_60%_28%_/_0.3)]">
                  <span className="font-display font-bold text-xl text-primary-foreground">{item.step}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              {index < 3 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-card rounded-2xl p-6 border border-border/50 shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] hover:shadow-[0_20px_50px_-15px_hsl(215_25%_15%_/_0.2)] hover:-translate-y-2 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <value.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-2">{value.title}</h3>
              <p className="text-muted-foreground">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
