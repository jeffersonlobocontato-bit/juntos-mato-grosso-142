import { useEffect, useRef, useState } from "react";
import { BASE_SUGESTOES } from "@/lib/sugestoesCounter";
import { supabase } from "@/integrations/supabase/client";
import MetodologiaVideo from "@/components/landing/MetodologiaVideo";
import MetodologiaDestaqueMidia from "@/components/landing/MetodologiaDestaqueMidia";
import MetodologiaGaleria from "@/components/landing/MetodologiaGaleria";
import MetodologiaEntidades from "@/components/landing/MetodologiaEntidades";
const logoClara = "/marca/moro-branco.png";
import fotoOficial from "@/assets/metodologia/foto-oficial-moro-ombros.png";

// ---------------------------------------------------------------------------
// Design system: identidade visual oficial da campanha Sergio Moro 2026,
// extraída do manual de marca (SERGIO MORO 2026.pdf). Paleta e tipografia
// exclusivas desta página — não reaproveita os tokens do site institucional
// Juntos Paraná 399, por exigência de fidelidade rigorosa à IDV oficial.
// ---------------------------------------------------------------------------
const BRAND = {
  navy: "#013D22",
  green900: "#00522D",
  green700: "#007540",
  green500: "#008544",
  lime: "#8DC73F",
  yellow: "#F8ED31",
  gold: "#FCB913",
  amber: "#F0B90B",
  orange: "#E1A514",
};

const CountUp = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const duration = 1400;
        const step = (t: number) => {
          const p = Math.min((t - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.floor(value * eased));
          if (p < 1) requestAnimationFrame(step);
          else setDisplay(value);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return <span ref={ref}>{display.toLocaleString("pt-BR")}{suffix}</span>;
};

const MENSAGEM_MORO = `Sou paranaense do interior. Atuei em várias regiões do Estado até me estabelecer em Curitiba. Como Juiz Federal e Senador da República, conheci a grande amplitude econômica do Paraná e a diversidade cultural de nossa gente.

Sabendo que cada cidade e cada região tem uma realidade própria, determinei à minha equipe que precisávamos de um Plano de Governo que olhasse de perto cada canto desse nosso Paraná, com o zelo e a obrigação de visitar todas as regiões, ouvindo as pessoas.

Um Plano de Governo corajoso para enfrentar as lutas ao lado do povo paranaense. Afinal, encarar desafios faz parte da minha história. Para promover uma revolução no judiciário brasileiro, com a Operação Lava Jato de Combate à Corrupção, enfrentei poderosos e o arcaico sistema político de nosso País.

Sempre lutei e continuarei lutando para transformar o lugar onde vivemos em um lugar mais justo, mais seguro, mais humano, mais próspero, mais sustentável e, principalmente, mais ético.

Para definir as prioridades do nosso projeto de governo, promovemos um amplo diálogo com a sociedade paranaense. Realizamos encontros e reuniões com representantes da população, homens e mulheres, lideranças regionais, entidades civis organizadas, associações empresariais, universidades e instituições técnicas.

Ao percorrer todas as regiões do Paraná, ouvimos atentamente as necessidades mais urgentes e estruturantes. Consultamos especialistas nos temas mais relevantes — saúde, educação, logística, desenvolvimento econômico, inovação, segurança e sustentabilidade. Identificamos soluções viáveis, com base em experiências de sucesso e dados concretos.

Esta carta de compromissos é o resultado desse esforço coletivo. Ela foi construída com a contribuição de centenas de técnicos, gestores públicos, lideranças comunitárias, empresários, intelectuais e voluntários que acreditam em um Paraná mais eficiente, justo e competitivo.

As demandas por melhores serviços públicos crescem a cada dia: atendimento digno na saúde, escolas mais modernas, transporte público de qualidade com tarifa justa, saneamento básico, mais segurança nas cidades, acesso a tecnologia, cultura e esporte, além da preservação ambiental.

O Paraná tem uma economia forte, diversificada e conectada ao mundo. Temos um povo trabalhador, inovador e resiliente. É hora de transformar esse potencial em oportunidades reais, com políticas públicas ágeis, eficientes e focadas em resultados.

O que propomos é um governo com planejamento, com metas e compromisso com as pessoas. Um governo que olha para o futuro, sem deixar ninguém para trás. Acima de tudo, vamos governar o Paraná juntos.`;

const DownloadPlanoCTA = () => (
  <section className="py-7 md:py-9" style={{ background: `${BRAND.navy}0d` }}>
    <div className="container mx-auto px-6 max-w-3xl text-center">
      <p className="text-[11px] md:text-xs font-bold tracking-wide uppercase mb-2" style={{ color: BRAND.green700 }}>
        O plano de governo será protocolado nesta sexta 14/08, quando poderá ser baixado
      </p>
      <h2 className="font-black text-xl md:text-2xl mb-3" style={{ color: BRAND.navy }}>
        BAIXE O PLANO DE GOVERNO
      </h2>
      <button
        disabled
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 opacity-60 cursor-not-allowed"
        style={{
          background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.amber})`,
          color: BRAND.navy,
        }}
        title="Disponível a partir de 14/08/2026"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Disponível em 14/08/2026
      </button>
    </div>
  </section>
);

export default function MetodologiaPlano() {
  const [sugestoesCount, setSugestoesCount] = useState<number | null>(null);
  const [showMensagem, setShowMensagem] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.rpc("get_sugestoes_formulario_count");
      if (cancelled) return;
      const total = BASE_SUGESTOES + (Number(data) || 0);
      setSugestoesCount(total);
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }} className="bg-white">
      {/* ============ HERO ============ */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${BRAND.navy} 0%, #182642 55%, ${BRAND.green900} 140%)` }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(circle at 85% 15%, ${BRAND.gold}33, transparent 55%)` }}
        />
        <div className="relative container mx-auto px-6 py-14 md:py-20 max-w-6xl">
          <img src={logoClara} alt="Moro" className="h-16 md:h-20 mb-10" />

          <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 items-center md:items-stretch">
            <div>
              <span
                className="inline-block text-xs md:text-sm font-bold tracking-wide uppercase px-4 py-2 rounded-full mb-6"
                style={{ background: `${BRAND.gold}22`, color: BRAND.gold, border: `1px solid ${BRAND.gold}55` }}
              >
                Metodologia do Plano de Governo
              </span>
              <h1
                className="font-black leading-[1.05] mb-6"
                style={{ fontSize: "clamp(2rem, 4.2vw, 3.4rem)", color: "#fff" }}
              >
                Um plano que nasceu ouvindo,{" "}
                <span style={{ color: BRAND.gold }}>não discursando</span>
              </h1>
              <p className="text-white/85 text-lg md:text-xl leading-relaxed max-w-xl mb-8">
                Antes de escrever uma proposta, fomos ouvir. Percorremos o Paraná,
                para que este plano de governo carregasse a voz de quem vive o Estado.
              </p>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRAND.gold }} />
                  Escuta popular geolocalizada
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRAND.gold }} />
                  Curadoria técnica especializada. 
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRAND.gold }} />
                  Revisão ponto a ponto
                </div>
              </div>
              {/* CTA — Mensagem do Sergio Moro */}
              <button
                onClick={() => setShowMensagem(true)}
                className="group inline-flex items-center gap-3 px-6 py-3 rounded-full font-bold text-sm md:text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.amber})`,
                  color: BRAND.navy,
                  boxShadow: `0 8px 30px ${BRAND.gold}40`,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Mensagem do Sergio Moro
              </button>
            </div>
            <div className="relative flex justify-center -mb-14 md:mb-0 md:block md:h-full md:self-stretch">
              <div
                className="absolute inset-x-0 bottom-0 h-3/4 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${BRAND.green500}, ${BRAND.gold})` }}
              />
              <img
                src={fotoOficial}
                alt="Sergio Moro"
                width={1920}
                height={1311}
                decoding="async"
                className="relative w-[22rem] sm:w-[26rem] object-contain object-bottom drop-shadow-2xl
                           md:absolute md:w-auto md:max-w-full md:right-0 md:left-auto
                           md:bottom-[-3.5rem] md:h-[calc(100%+3.5rem)] lg:bottom-[-5rem] lg:h-[calc(100%+5rem)]
                           md:scale-[1.35] md:origin-bottom"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ RESPEITO — DUPLA LEITURA ============ */}
      <section className="container mx-auto px-6 py-14 md:py-20 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8">
          <div
            className="rounded-2xl p-7 md:p-8"
            style={{ background: `${BRAND.green900}0d`, borderLeft: `4px solid ${BRAND.green900}` }}
          >
            <h3 className="font-black text-xl mb-3" style={{ color: BRAND.green900 }}>
              Respeito a quem foi ouvido
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Cada sugestão enviada por um cidadão paranaense foi lida, catalogada e geolocalizada,
              não como estatística, mas como retrato real de uma cidade, de uma vida. Ouvir de verdade,
              reafirma o propósito de governar para as familias paranaenses.
            </p>
          </div>
          <div
            className="rounded-2xl p-7 md:p-8"
            style={{ background: `${BRAND.navy}0d`, borderLeft: `4px solid ${BRAND.navy}` }}
          >
            <h3 className="font-black text-xl mb-3" style={{ color: BRAND.navy }}>
              Respeito a quem contribuiu
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Cada proposta técnica passou por curadoria de exequibilidade e orçamento antes de
              chegar à versão final. Ineditismo, também foi a cautela de transformar
              escuta em proposta que pode, de fato, ser cumprida.
            </p>
          </div>
        </div>
      </section>

      {/* ============ CTA — BAIXE O PLANO DE GOVERNO (entre 2ª e 3ª dobras) ============ */}
      <DownloadPlanoCTA />

      <MetodologiaGaleria brand={{ navy: BRAND.navy, green500: BRAND.green500, green700: BRAND.green700 }} />

      <MetodologiaEntidades brand={{ navy: BRAND.navy, green500: BRAND.green500, green700: BRAND.green700 }} />

      {/* ============ BIG NUMBERS ============ */}
      <section className="py-16 md:py-24" style={{ background: BRAND.navy }}>
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-wide uppercase" style={{ color: BRAND.gold }}>
              Não é discurso. É método.
            </span>
            <h2 className="font-black text-2xl md:text-4xl text-white mt-2">
              O maior processo de escuta já feito para um plano de governo no Paraná
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {[
              { value: 399, label: "municípios paranaenses alcançados pela escuta" },
              { value: 100, suffix: "+", label: "entidades que enviaram documentos e propostas" },
              { value: 200, suffix: "+", label: "especialistas técnicos de todas as regiões" },
              { value: sugestoesCount ?? BASE_SUGESTOES, label: "sugestões populares recebidas e geolocalizadas" },
            ].map((n, i) => (
              <div key={i} className="rounded-2xl p-6 text-center" style={{ background: "#ffffff0f", border: "1px solid #ffffff1a" }}>
                <p className="font-black text-3xl md:text-4xl mb-1" style={{ color: BRAND.gold }}>
                  <CountUp value={n.value} suffix={n.suffix || ""} />
                </p>
                <p className="text-white/75 text-xs md:text-sm leading-snug">{n.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-5">
            {[
              { value: 5, label: "eixos estruturantes" },
              { value: 27, label: "temáticas de governo" },
              { value: 1200, suffix: "+", label: "propostas técnicas analisadas" },
            ].map((n, i) => (
              <div key={i} className="rounded-2xl p-6 text-center" style={{ background: `${BRAND.green900}55`, border: `1px solid ${BRAND.green500}33` }}>
                <p className="font-black text-2xl md:text-3xl mb-1 text-white">
                  <CountUp value={n.value} suffix={n.suffix || ""} />
                </p>
                <p className="text-white/70 text-xs md:text-sm">{n.label}</p>
              </div>
            ))}
          </div>

          <p className="text-white/50 text-xs text-center mt-8 max-w-2xl mx-auto">
            Coordenação geral do processo: pré-candidato a vice-governador Edson Vasconcelos. Cada
            contribuição foi analisada, ponto a ponto, pelo pré-candidato a governador Sergio Moro.
            100% das contribuições foram documentadas, catalogadas e geolocalizadas.
          </p>
        </div>
      </section>

      {/* ============ DESTAQUE NA MÍDIA ============ */}
      <MetodologiaDestaqueMidia brand={{ navy: BRAND.navy, green500: BRAND.green500, green700: BRAND.green700 }} />

      {/* ============ VÍDEO ============ */}
      <MetodologiaVideo navy={BRAND.navy} green700={BRAND.green700} green900={BRAND.green900} />

      {/* ============ NOTA EXPLICATIVA — MAPA DE CALOR ============ */}
      <section className="py-14 md:py-20" style={{ background: `${BRAND.green500}0d` }}>
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="rounded-2xl p-8 md:p-10 bg-white shadow-sm" style={{ border: `1px solid ${BRAND.green500}33` }}>
            <h3 className="font-black text-xl md:text-2xl mb-4" style={{ color: BRAND.green900 }}>
              Como a sugestão popular contribuiu para o plano de governo
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              A sugestão popular foi tratada como mapa de calor de expectativa. Cada
              sugestão, geolocalizada por município e região, revelou onde a dor da população é
              mais forte e qual prioridade pesa mais em cada canto do Estado.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Esse mapa foi cruzado com as propostas técnicas estruturadas pelos especialistas,
              garantindo que o plano final tivesse aderência real às dores e prioridades de cada
              região, e não apenas a uma leitura genérica do Paraná.
            </p>
          </div>
        </div>
      </section>

      {/* ============ CTA POPULAR ============ */}
      <section className="py-12 md:py-16" style={{ background: BRAND.green900 }}>
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="font-black text-2xl md:text-4xl text-white mb-4">
            O QUE VOCÊ ESPERA DO PRÓXIMO GOVERNO?
          </h2>
          <p className="text-white/80 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Sua opinião é fundamental para construirmos um Paraná mais justo, seguro e próspero.
            Conte o que você espera do próximo governo e ajude a definir as prioridades do Estado.
          </p>
          <a
            href="https://juntosparana399.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-black text-base md:text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.amber})`,
              color: BRAND.navy,
              boxShadow: `0 10px 35px ${BRAND.gold}50`,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            ENVIAR MINHA OPINIÃO
          </a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-10" style={{ background: BRAND.navy }}>
        <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoClara} alt="Moro" className="h-10" />
          <p className="text-white/50 text-xs text-center md:text-right">
            Paraná, a nossa fortaleza! — Metodologia do Plano de Governo, construída com o Paraná.
          </p>
        </div>
      </footer>

      {/* ============ MODAL — MENSAGEM DO SERGIO MORO ============ */}
      {showMensagem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200"
          style={{ background: "rgba(33, 49, 82, 0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowMensagem(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ border: `1px solid ${BRAND.gold}44` }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 md:px-8 py-5"
              style={{ background: `linear-gradient(135deg, ${BRAND.navy}, #182642)` }}
            >
              <div className="flex items-center gap-3">
                <img src={logoClara} alt="Moro" className="h-8" />
                <div>
                  <h3 className="font-black text-white text-lg leading-tight">Mensagem do Sergio Moro</h3>
                  <p className="text-white/60 text-xs">Carta de compromissos com o Paraná</p>
                </div>
              </div>
              <button
                onClick={() => setShowMensagem(false)}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                aria-label="Fechar"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 md:px-10 py-8">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: `${BRAND.green500}33` }}>
                <img
                  src={fotoOficial}
                  alt="Sergio Moro"
                  className="w-16 h-16 object-contain rounded-full shrink-0"
                  style={{ background: `${BRAND.navy}0d` }}
                />
                <div>
                  <p className="font-bold text-sm" style={{ color: BRAND.navy }}>Sergio Moro</p>
                  <p className="text-xs text-gray-500">Candidato a Governador do Paraná</p>
                </div>
              </div>
              <div className="space-y-4">
                {MENSAGEM_MORO.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-gray-700 leading-relaxed text-sm md:text-base"
                    style={{ textAlign: "justify" }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: `${BRAND.green500}22` }}>
                <p className="font-black text-lg" style={{ color: BRAND.green900 }}>
                  Vamos governar o Paraná juntos.
                </p>
                <button
                  onClick={() => setShowMensagem(false)}
                  className="mt-4 px-6 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105"
                  style={{ background: BRAND.gold, color: BRAND.navy }}
                >
                  Continuar navegando
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
