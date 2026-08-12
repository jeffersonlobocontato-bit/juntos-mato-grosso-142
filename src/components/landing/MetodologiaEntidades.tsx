type Brand = { navy: string; green500: string; green700: string };

const ENTIDADES = [
  "Sistema Fiep","FAEP/SENAR-PR","Fetranspar","OCEPAR","UOPECAN","Femipa","CRM-PR","AMP",
  "Feapaes-PR","POD","Agência de Desenvolvimento do Sudoeste","Sindicato Rural de Cascavel",
  "Sindicato Rural de Toledo","Sindicato Rural de Guarapuava","Sindicato Rural de Palotina",
  "Sindicato Rural de Prudentópolis","Sindicato Rural de Laranjeiras do Sul","Sindicato Rural de Guaíra",
  "Sindicato Rural de Terra Roxa","ACP","ACIC Cascavel","ACIM Maringá","ACIL Londrina","ACIAP Paranavaí",
  "ACIU Umuarama","ACIPG Ponta Grossa","ACIFI Foz do Iguaçu","ACIT Toledo","ACIA Apucarana","ACIG Guarapuava",
  "ACIA Arapongas","ACIR Rolândia","ACEPB Pato Branco","ACIMACAR Marechal Cândido Rondon","ACIPA Palotina",
  "ACIQI","CACIOPAR","CACISPAR","CACINP","CONDEF","PRODESG","CDU","CODEFOZ","CODEMED","CODEM Maringá",
  "CDPG","CODESC","NURESPOP","FETAEP","UNIPROLEITE","Rede do Terceiro Setor","Sinduscon Paraná",
  "Sinduscon Norte Paraná","Sinduscon Paraná Oeste","Sicepot Paraná","Fentitabaco",
  "Sindicato Rural de Alto Paraná","Santa Casa de Paranavaí","UENOR","UNDIME","Carta Pato Branco",
  "Todos Pela Educação","ABIOGÁS","CODETRI","Núcleo de Desenvolvimento Empresarial de Londrina","SENEPE",
  "Software By Maringá","Gerar","CREFI","Sociedade Rural do Meio Oeste",
  "Movimento Contra a Perturbação de Sossego","AMSOP","Agenda Animalista","APEPA",
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
            Entidades de todo o Paraná
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
