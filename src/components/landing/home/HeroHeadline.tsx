import { Users, Megaphone } from "lucide-react";

const HeroHeadline = () => {
  return (
    <div className="space-y-6">
      <div className="chip-gold whitespace-nowrap w-fit">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Megaphone className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm leading-tight">
          Sua voz ajuda a decidir <strong>o futuro do Paraná.</strong>
        </span>
      </div>

      <h1 className="font-display font-black text-foreground leading-[1.05] tracking-tight text-4xl md:text-5xl lg:text-6xl">
        <span className="text-accent">O destino certo,</span>
        <br />
        é o <span className="underline-gold text-primary">futuro decidido</span>
        <br />
        <span className="text-primary">por todos os paranaenses.</span>
      </h1>

      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display font-bold text-lg text-foreground">Plano de Governo Colaborativo</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Compartilhe sua opinião e ajude a construir o futuro do Paraná.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroHeadline;