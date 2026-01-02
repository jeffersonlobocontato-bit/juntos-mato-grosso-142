import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, MessageCircle, Facebook, Linkedin, Send, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FloatingShareButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const message = "Participe da Rota 399! Ajude a construir o futuro do Paraná 🌲";
  const url = typeof window !== "undefined" ? window.location.origin : "https://rota399.org.br";
  const shareText = encodeURIComponent(message);
  const shareUrl = encodeURIComponent(url);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      color: "bg-[#25D366]",
    },
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`,
      color: "bg-[#1877F2]",
    },
    {
      name: "Twitter/X",
      icon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: "bg-foreground",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: "bg-[#0A66C2]",
    },
    {
      name: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
      color: "bg-[#0088CC]",
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${message} ${url}`);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "Agora é só colar e compartilhar.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Erro ao copiar",
        variant: "destructive",
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 left-0 bg-card rounded-2xl shadow-xl border border-border p-4 min-w-[200px]"
          >
            <p className="text-sm font-medium text-foreground mb-3">
              Compartilhe nas redes:
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
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
              Convide seus amigos! 🌲
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, type: "spring" }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen 
            ? "bg-muted text-foreground" 
            : "bg-primary text-primary-foreground"
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Share2 className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Pulse animation when closed */}
      {!isOpen && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary pointer-events-none"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
};

export default FloatingShareButton;
