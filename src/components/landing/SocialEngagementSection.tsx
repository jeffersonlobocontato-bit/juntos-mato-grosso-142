import { motion } from "framer-motion";
import { Heart, Share2, Users, Zap } from "lucide-react";
import SocialShareButtons from "./SocialShareButtons";

const benefits = [
  {
    icon: Users,
    title: "Mais vozes",
    description: "Cada pessoa traz uma perspectiva única",
  },
  {
    icon: Heart,
    title: "Mais impacto",
    description: "Unidos somos mais fortes",
  },
  {
    icon: Zap,
    title: "Mais mudança",
    description: "Juntos transformamos o Paraná",
  },
];

const SocialEngagementSection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-6"
          >
            <Share2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Faça parte deste movimento
            </span>
          </motion.div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Compartilhe o Juntos Paraná 399,
            <br />
            <span className="text-accent">com quem ama o Paraná</span>
          </h2>

          <p className="text-lg text-muted-foreground mb-8">
            Quanto mais pessoas participarem, mais forte será a voz do Paraná. 
            Convide amigos, familiares e conhecidos para construir esse futuro juntos.
          </p>

          {/* Share buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-border/50 max-w-xl mx-auto mb-12"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Escolha sua rede favorita:
            </p>
            <SocialShareButtons 
              variant="large"
              message="Estou participando do Juntos Paraná 399, uma iniciativa para construir juntos o futuro do Paraná! Venha contribuir também 🌲"
            />
          </motion.div>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl p-6 text-center border border-border/30 hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialEngagementSection;
