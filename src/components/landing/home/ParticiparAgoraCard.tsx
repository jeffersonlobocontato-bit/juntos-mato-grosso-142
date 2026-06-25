import { Users, ShieldCheck, Heart } from "lucide-react";

const bullets = [
  { Icon: Users, text: "Sua participação faz a diferença." },
  { Icon: ShieldCheck, text: "Suas opiniões são seguras e transparentes." },
  { Icon: Heart, text: "Juntos, vamos construir um Paraná melhor para todos." },
];

const ParticiparAgoraCard = () => {
  return (
    <aside className="relative rounded-3xl bg-gradient-cta p-8 text-primary-foreground shadow-card-float overflow-hidden">
      <h3 className="font-display font-black text-4xl leading-none mb-8">
        Participe <br />
        <span className="text-accent">agora!</span>
      </h3>

      <ul className="space-y-5">
        {bullets.map(({ Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary shadow-md">
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-sm leading-snug pt-2">{text}</p>
          </li>
        ))}
      </ul>

      <div className="my-6 h-px bg-accent/60" />

      <p className="text-base leading-snug">
        O futuro do Paraná <br />
        é construído hoje, <br />
        <span className="text-accent font-bold">com você.</span>
      </p>
    </aside>
  );
};

export default ParticiparAgoraCard;