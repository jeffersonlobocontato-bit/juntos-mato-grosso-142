type Brand = { navy: string; green500: string; green700: string };

const ENTIDADES = [
  "Famato","Aprosoja-MT","Acrimat","Sistema Fecomércio-MT","Fiemt","Sistema OCB/MT","Sebrae-MT",
  "AMM — Associação Mato-grossense dos Municípios","UNEMAT","UFMT","CRM-MT","OAB-MT",
  "Sinduscon-MT","Fetagri-MT","UNDIME-MT","Todos Pela Educação",
];

const MetodologiaEntidades = ({ brand }: { brand: Brand }) => {
  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-8">
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: brand.green700 }}>
            PARTICIPAÇÃO
          </span>
          <h2 className="font-black text-2xl md:text-4xl mt-2" style={{ color: brand.navy }}>
            Entidades de todo o Mato Grosso
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto text-sm">
            Algumas das instituições, federações, associações e movimentos que contribuíram
            com a construção do plano de governo.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-1 gap-y-2 text-xs md:text-sm leading-relaxed" style={{ color: brand.navy }}>
          {ENTIDADES.map((nome, i) => (
            <span key={nome} className="whitespace-nowrap">
              {nome}
              {i < ENTIDADES.length - 1 && (
                <span className="inline-block mx-2 opacity-40" aria-hidden="true">•</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetodologiaEntidades;
