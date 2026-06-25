import portrait from "@/assets/sergio-moro.jpg";

const HeroPortrait = () => {
  return (
    <div className="relative w-full">
      <div className="relative mx-auto max-w-md lg:max-w-none overflow-hidden rounded-[2rem] shadow-card-float">
        <img
          src={portrait}
          alt="Senador Sergio Moro - pré-candidato ao Governo do Paraná"
          className="w-full h-auto object-cover object-top"
          loading="eager"
          decoding="async"
        />
        {/* Nameplate overlay at base */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary via-primary/90 to-primary/0 pt-16 pb-5 px-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-black uppercase leading-none text-secondary tracking-tight text-3xl md:text-4xl lg:text-[2.6rem] drop-shadow">
                Sergio Moro
              </p>
              <p className="mt-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-secondary/95">
                Senador • Pré-candidato ao Governo do Paraná
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-secondary px-2.5 py-1 font-display font-black text-secondary-foreground text-sm leading-none shadow-md">
              399
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroPortrait;