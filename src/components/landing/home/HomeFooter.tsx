import { ShieldCheck, Send } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import SocialShareButtons from "@/components/landing/SocialShareButtons";

const HomeFooter = () => {
  const { trackComponentClick } = useAnalytics();
  const scrollToForm = () => {
    trackComponentClick("HomeFooter", "cta_enviar_opiniao");
    const el = document.getElementById("opiniao-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const input = el.querySelector<HTMLElement>("input, textarea, select");
      setTimeout(() => input?.focus({ preventScroll: true }), 600);
    }
  };

  return (
    <footer data-component="HomeFooter" className="relative z-10 mt-16 px-4 md:px-8 lg:px-12 pb-10">
      <div className="container mx-auto flex flex-col items-center gap-8">
        <button
          type="button"
          onClick={scrollToForm}
          className="w-full md:w-auto h-14 px-10 rounded-full bg-gradient-cta text-primary-foreground font-display font-bold text-lg inline-flex items-center justify-center gap-3 shadow-card-float hover:brightness-110 transition"
        >
          <Send className="h-5 w-5" />
          Enviar opinião agora
        </button>

        <div className="flex items-start gap-3 text-foreground/80 w-full">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary shadow-md">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <p className="text-sm md:text-base leading-snug">
          Transparência, diálogo e participação. <br />
          Esse é o caminho do <strong className="text-primary">Paraná</strong> que queremos.
        </p>
        </div>

        <div className="w-full pt-6 mt-2 border-t border-border/50 space-y-4 text-center">
          <div className="space-y-1">
            <h3 className="font-display font-black text-2xl md:text-3xl text-foreground">
              Envie e convide seus amigos e familiares
            </h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Participe da construção do Plano de Governo do Paraná. Compartilhe agora com quem
              você quer ver contribuindo para o futuro do nosso estado.
            </p>
          </div>
          <SocialShareButtons
            message="Participe do Juntos Paraná 399 e ajude a construir o Plano de Governo do Paraná com sua opinião. Sua voz transforma o futuro do nosso estado! 🌲"
          />
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;