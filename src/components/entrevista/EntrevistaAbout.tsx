import { motion } from "framer-motion";
import { Users, Target, Eye, Shield, FileText, MapPin, CheckCircle, BarChart3 } from "lucide-react";

const values = [
  {
    icon: Users,
    title: "Participação",
    description: "Ouça a voz de todos os 399 municípios do Paraná.",
  },
  {
    icon: Target,
    title: "Técnica",
    description: "Propostas embasadas e validadas por especialistas.",
  },
  {
    icon: Eye,
    title: "Transparência",
    description: "Acompanhe cada etapa do processo.",
  },
  {
    icon: Shield,
    title: "Compromisso",
    description: "Metas claras e indicadores mensuráveis.",
  },
];

const processSteps = [
  { icon: FileText, title: "Entrevistas", desc: "Especialistas de cada eixo são ouvidos" },
  { icon: MapPin, title: "Regionalização", desc: "Propostas por município" },
  { icon: CheckCircle, title: "Validação", desc: "Revisão técnica estruturada" },
  { icon: BarChart3, title: "Consolidação", desc: "Proposta final aprovada" },
];

const EntrevistaAbout = () => {
  return (
    <section id="sobre" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Sobre a Iniciativa
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Construindo o Futuro do Paraná
            <span className="text-primary"> Juntos</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            A Rota 399 percorre todos os municípios paranaenses para coletar 
            propostas técnicas e sugestões da população, construindo colaborativamente 
            um Plano de Governo para o Paraná.
          </p>
        </motion.div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {processSteps.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-card rounded-xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-3 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                  <item.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              {index < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-card rounded-xl p-5 border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <value.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{value.title}</h3>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EntrevistaAbout;
