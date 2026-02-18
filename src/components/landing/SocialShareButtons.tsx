import { motion } from "framer-motion";
import { Check, Copy, Facebook, Linkedin, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SocialShareButtonsProps {
  message?: string;
  url?: string;
  variant?: "default" | "compact" | "large";
  className?: string;
}

const SocialShareButtons = ({
  message = "Participe do Juntos Paraná 399! Ajude a construir o futuro do Paraná 🌲",
  url = typeof window !== "undefined" ? window.location.origin : "https://rota399.org.br",
  variant = "default",
  className = "",
}: SocialShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareText = encodeURIComponent(message);
  const shareUrl = encodeURIComponent(url);

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      color: "hover:bg-[#25D366] hover:text-white",
      bgColor: "bg-[#25D366]",
    },
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`,
      color: "hover:bg-[#1877F2] hover:text-white",
      bgColor: "bg-[#1877F2]",
    },
    {
      name: "Twitter/X",
      icon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      color: "hover:bg-foreground hover:text-background",
      bgColor: "bg-foreground",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: "hover:bg-[#0A66C2] hover:text-white",
      bgColor: "bg-[#0A66C2]",
    },
    {
      name: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
      color: "hover:bg-[#0088CC] hover:text-white",
      bgColor: "bg-[#0088CC]",
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${message} ${url}`);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "Agora é só colar e compartilhar com seus amigos.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Juntos Paraná 399",
          text: message,
          url: url,
        });
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled or failed:", err);
      }
    }
  };

  const buttonSize = variant === "compact" ? "h-10 w-10" : variant === "large" ? "h-14 w-14" : "h-12 w-12";
  const iconSize = variant === "compact" ? "w-4 h-4" : variant === "large" ? "w-6 h-6" : "w-5 h-5";

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      {socialLinks.map((social, index) => {
        const IconComponent = social.icon;
        return (
          <motion.a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`${buttonSize} rounded-xl bg-muted flex items-center justify-center transition-all duration-300 ${social.color}`}
            title={`Compartilhar no ${social.name}`}
          >
            <IconComponent className={iconSize} />
          </motion.a>
        );
      })}

      <motion.button
        onClick={handleCopyLink}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`${buttonSize} rounded-xl bg-muted flex items-center justify-center transition-all duration-300 hover:bg-primary hover:text-primary-foreground`}
        title="Copiar link"
      >
        {copied ? <Check className={iconSize} /> : <Copy className={iconSize} />}
      </motion.button>

      {/* Native Share API button (mobile) */}
      {typeof navigator !== "undefined" && navigator.share && (
        <Button
          onClick={handleNativeShare}
          variant="outline"
          size={variant === "large" ? "lg" : "default"}
          className="ml-2"
        >
          Mais opções
        </Button>
      )}
    </div>
  );
};

export default SocialShareButtons;
