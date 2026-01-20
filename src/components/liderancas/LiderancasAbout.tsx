import { motion } from "framer-motion";
import { Users, Target, Mic, Award, FileText, CheckCircle, Sparkles, BookOpen } from "lucide-react";

const benefits = [
  {
    icon: Mic,
    title: "Voz Ativa",
    description: "Suas propostas serão ouvidas e consideradas pela equipe técnica.",
  },
  {
    icon: Target,
    title: "Impacto Real",
    description: "Contribua para políticas públicas efetivas no Paraná.",
  },
  {
    icon: Users,
    title: "Rede de Colaboração",
    description: "Conecte-se com outras lideranças e gestores públicos.",
  },
  {
    icon: Award,
    title: "Protagonismo",
    description: "Seja parte ativa da construção do futuro do estado.",
  },
];

const processSteps = [
  { icon: FileText, title: "Envie sua Proposta", desc: "Preencha o formulário com sua ideia" },
  { icon: CheckCircle, title: "Revisão Técnica", desc: "Equipe analisa viabilidade e impacto" },
  { icon: Sparkles, title: "Consolidação", desc: "Proposta é refinada e integrada" },
  { icon: BookOpen, title: "Publicação no Plano", desc: "Contribuição vira política pública" },
];

const LiderancasAbout = () => {
  return (
    <section id="sobre-liderancas" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Por que Participar?
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Lideranças e Gestores são
            <span className="text-primary"> Fundamentais</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            A Rota 399 valoriza a experiência de quem está na linha de frente da gestão pública. 
            Prefeitos, secretários, vereadores e lideranças comunitárias têm conhecimento único 
            sobre as necessidades reais de cada região.
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
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

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h3 className="font-display text-2xl font-bold text-foreground">
            Benefícios de Participar
          </h3>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-card rounded-xl p-5 border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiderancasAbout;
