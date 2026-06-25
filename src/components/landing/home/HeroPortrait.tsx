import { Users } from "lucide-react";
import portrait from "@/assets/sergio-moro.jpg";

const HeroPortrait = () => {
  return (
    <div className="relative w-full">
      <div className="relative mx-auto max-w-md lg:max-w-none">
        <img
          src={portrait}
          alt="Sergio Moro"
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