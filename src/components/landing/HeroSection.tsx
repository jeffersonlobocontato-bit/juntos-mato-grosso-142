import { useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles, Share2, X, MessageCircle, Facebook, Linkedin, Send, Copy, Check } from "lucide-react";
import heroImage from "@/assets/hero-parana.jpg";
import { useToast } from "@/hooks/use-toast";
const HeroSection = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const message = "Participe do Juntos Paraná 399! Ajude a construir o futuro do Paraná 🌲";
  const url = typeof window !== "undefined" ? window.location.origin : "https://rota399.org.br";
  const shareText = encodeURIComponent(message);
  const shareUrl = encodeURIComponent(url);

  const socialLinks = [
    { name: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${shareText}%20${shareUrl}`, color: "bg-[#25D366]" },
    { name: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`, color: "bg-[#1877F2]" },
    { name: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, color: "bg-[#0A66C2]" },
    { name: "Telegram", icon: Send, href: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`, color: "bg-[#0088CC]" },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${message} ${url}`);
      setCopied(true);
      toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Cataratas do Iguaçu, Paraná"
          className="w-full h-[120%] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/30 to-foreground/60" />
      </motion.div>

      {/* Content */}
      <motion.div style={{ opacity }} className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 mb-8"
        >
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-primary-foreground">
            399 municípios, um só destino
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-primary-foreground mb-6 leading-tight"
        >
          Juntos Paraná 399:
          <br />
          <span className="text-accent">o destino certo,</span>
          <br />
          é o futuro decidido por todos os paranaenses
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10"
        >
          Uma iniciativa para construir colaborativamente um Plano de Governo 
          para o Paraná, ouvindo quem vive os 399 municípios.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => scrollToSection("sugestao")}
            variant="hero"
            size="xl"
            className="group"
          >
            <span>Envie sua Sugestão</span>
            <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
          </Button>
          <Button
            onClick={() => scrollToSection("sobre")}
            variant="heroOutline"
            size="xl"
          >
            Saiba Mais
          </Button>
          <div className="relative">
            <Button
              onClick={() => setShowShareMenu(!showShareMenu)}
              variant="heroOutline"
              size="xl"
              className="gap-2"
            >
              <Share2 className="w-5 h-5" />
              <span>Convide Amigos</span>
            </Button>
            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-card rounded-2xl shadow-xl border border-border p-4 min-w-[220px] z-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">Compartilhe:</p>
                    <button onClick={() => setShowShareMenu(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {socialLinks.map((social) => {
                      const IconComponent = social.icon;
                      return (
                        <a
                          key={social.name}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-10 h-10 rounded-xl ${social.color} flex items-center justify-center text-white transition-transform hover:scale-110`}
                          title={social.name}
                        >
                          <IconComponent className="w-5 h-5" />
                        </a>
                      );
                    })}
                    <button
                      onClick={handleCopyLink}
                      className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground transition-transform hover:scale-110 hover:bg-primary hover:text-primary-foreground"
                      title="Copiar link"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Juntos somos mais fortes! 🌲
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.button
          onClick={() => scrollToSection("sobre")}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
        >
          <span className="text-xs font-medium uppercase tracking-wider">Explore</span>
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </section>
  );
};

export default HeroSection;
