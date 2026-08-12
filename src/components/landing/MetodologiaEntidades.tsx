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
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: brand.green700 }}>
            Escuta qualificada
          </span>
          <h2 className="font-black text-2xl md:text-4xl mt-2" style={{ color: brand.navy }}>
            Entidades que participaram do processo
          </h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            {ENTIDADES.length} instituições, federações, associações e movimentos que contribuíram
            com a construção do plano de governo.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {ENTIDADES.map((nome) => (
            <span
              key={nome}
              className="rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                color: brand.navy,
                background: `${brand.green500}12`,
                border: `1px solid ${brand.green500}40`,
              }}
            >
              {nome}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetodologiaEntidades;
