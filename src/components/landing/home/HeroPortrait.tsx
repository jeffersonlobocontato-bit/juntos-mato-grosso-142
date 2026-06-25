import { Users } from "lucide-react";
import portrait from "@/assets/sergio-moro.jpg";

const HeroPortrait = () => {
  return (
    <div className="relative w-full">
      <div className="relative mx-auto max-w-md lg:max-w-none">
        <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1">
          <span className="inline-flex items-center rounded-full bg-primary/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-md ring-1 ring-secondary/40">
            Senador Sergio Moro
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground shadow-md">
            Pré-candidato ao Governo do Paraná
          </span>
        </div>
        <img
          src={portrait}
          alt="Senador Sergio Moro - pré-candidato ao Governo do Paraná"
          className="w-full h-auto object-cover object-top rounded-[2rem] shadow-card-float"
          loading="eager"
          decoding="async"
        />
        {/* Gold chip overlay */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 chip-gold whitespace-nowrap">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Users className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm leading-tight">
            Sua voz ajuda a decidir <br className="hidden sm:inline" />
            <strong>o futuro do Paraná.</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeroPortrait;