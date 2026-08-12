import { useEffect, useRef, useState } from "react";
import { BASE_SUGESTOES } from "@/lib/sugestoesCounter";
import { supabase } from "@/integrations/supabase/client";
import MetodologiaVideo from "@/components/landing/MetodologiaVideo";
import logoClara from "@/assets/metodologia/logo-clara-recortada.png";
import fotoOficial from "@/assets/metodologia/foto-oficial-moro.png";

// ---------------------------------------------------------------------------
// Design system: identidade visual oficial da campanha Sergio Moro 2026,
// extraída do manual de marca (SERGIO MORO 2026.pdf). Paleta e tipografia
// exclusivas desta página — não reaproveita os tokens do site institucional
// Juntos Paraná 399, por exigência de fidelidade rigorosa à IDV oficial.
// ---------------------------------------------------------------------------
const BRAND = {
  navy: "#213152",
  green900: "#327832",
  green700: "#4a9a3f",
  green500: "#96b932",
  lime: "#b4c828",
  yellow: "#f5e600",
  gold: "#fadc00",
  amber: "#f0c300",
  orange: "#e1a514",
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

export default function MetodologiaPlano() {
  const [sugestoesCount, setSugestoesCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc("get_sugestoes_formulario_count").then(({ data }) => {
      const total = BASE_SUGESTOES + (Number(data) || 0);
      setSugestoesCount(total);
    });
  }, []);

  const galeriaPlaceholders = Array.from({ length: 8 }, (_, i) => i);

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
          <img src={logoClara} alt="Sergio Moro 22 - Governador" className="h-16 md:h-20 mb-10" />

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
                Antes de escrever uma proposta, fomos ouvir. Percorremos o Paraná, cidade por cidade,
                para que este plano de governo carregasse a voz de quem vive o Estado — e não apenas
                o discurso de quem quer governá-lo.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRAND.gold }} />
                  Escuta popular geolocalizada
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRAND.gold }} />
                  Curadoria técnica independente
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRAND.gold }} />
                  Revisão ponto a ponto
                </div>
              </div>
            </div>
            <div className="relative flex justify-center -mb-14 md:mb-0 md:block md:h-full md:self-stretch">
              <div
                className="absolute inset-x-0 bottom-0 h-3/4 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${BRAND.green500}, ${BRAND.gold})` }}
              />
              <img
                src={fotoOficial}
                alt="Sergio Moro"
                className="relative w-72 sm:w-80 object-contain object-bottom drop-shadow-2xl
                           md:absolute md:w-auto md:max-w-none md:right-[-4rem] lg:right-[-6rem]
                           md:bottom-[-3.5rem] md:h-[calc(100%+3.5rem)] lg:bottom-[-5rem] lg:h-[calc(100%+5rem)]"
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
              Cada sugestão enviada por um cidadão paranaense foi lida, catalogada e geolocalizada —
              não como estatística de campanha, mas como retrato real de uma cidade, de um bairro,
              de uma vida. Ouvir de verdade é o oposto de fingir que ouviu.
            </p>
          </div>
          <div
            className="rounded-2xl p-7 md:p-8"
            style={{ background: `${BRAND.navy}0d`, borderLeft: `4px solid ${BRAND.navy}` }}
          >
            <h3 className="font-black text-xl mb-3" style={{ color: BRAND.navy }}>
              Respeito a quem construiu com técnica
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Cada proposta técnica passou por curadoria de exequibilidade e orçamento antes de
              chegar à versão final. Ineditismo não é só ouvir — é ter a cautela de transformar
              escuta em proposta que pode, de fato, ser cumprida.
            </p>
          </div>
        </div>
      </section>

      {/* ============ GALERIA — SCROLL LATERAL ============ */}
      <section className="py-14 md:py-20" style={{ background: "#f7f8f5" }}>
        <div className="container mx-auto px-6 max-w-6xl mb-8">
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: BRAND.green700 }}>
            Registro do processo
          </span>
          <h2 className="font-black text-2xl md:text-3xl mt-2" style={{ color: BRAND.navy }}>
            Reuniões, entregas e escuta em cada região do Paraná
          </h2>
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 px-6 container mx-auto max-w-6xl" style={{ width: "max-content" }}>
            {galeriaPlaceholders.map((i) => (
              <div
                key={i}
                className="w-64 h-80 shrink-0 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed"
                style={{ borderColor: `${BRAND.green500}66`, background: `${BRAND.green500}0a` }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black"
                  style={{ background: `${BRAND.green500}22`, color: BRAND.green700 }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-center px-4" style={{ color: BRAND.navy }}>
                  Foto de reunião / entrega de documento
                </p>
                <p className="text-[11px] text-gray-400 px-4 text-center">substituir por imagem real</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              { value: 200, suffix: "+", label: "entidades que enviaram documentos e propostas" },
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
              { value: 327, label: "propostas técnicas estruturadas" },
            ].map((n, i) => (
              <div key={i} className="rounded-2xl p-6 text-center" style={{ background: `${BRAND.green900}55`, border: `1px solid ${BRAND.green500}33` }}>
                <p className="font-black text-2xl md:text-3xl mb-1 text-white">
                  <CountUp value={n.value} />
                </p>
                <p className="text-white/70 text-xs md:text-sm">{n.label}</p>
              </div>
            ))}
          </div>

          <p className="text-white/50 text-xs text-center mt-8 max-w-2xl mx-auto">
            Coordenação geral do processo: candidato a vice-governador Edson Vasconcelos. Cada
            contribuição foi analisada, ponto a ponto, pelo candidato a governador Sergio Moro.
            100% das contribuições foram documentadas, catalogadas e geolocalizadas.
          </p>
        </div>
      </section>

      {/* ============ VÍDEO ============ */}
      <MetodologiaVideo navy={BRAND.navy} green700={BRAND.green700} green900={BRAND.green900} />

      {/* ============ NOTA EXPLICATIVA — MAPA DE CALOR ============ */}
      <section className="py-14 md:py-20" style={{ background: `${BRAND.green500}0d` }}>
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="rounded-2xl p-8 md:p-10 bg-white shadow-sm" style={{ border: `1px solid ${BRAND.green500}33` }}>
            <h3 className="font-black text-xl md:text-2xl mb-4" style={{ color: BRAND.green900 }}>
              Como a sugestão popular se tornou plano de governo
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              A sugestão popular não foi tratada como proposta pronta — foi tratada como{" "}
              <strong style={{ color: BRAND.navy }}>mapa de calor de expectativa</strong>. Cada
              sugestão, geolocalizada por município e região, revelou onde a dor da população é
              mais forte e qual prioridade pesa mais em cada canto do Estado.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Esse mapa foi cruzado com as propostas técnicas estruturadas pelos especialistas —
              garantindo que o plano final tivesse aderência real às dores e prioridades de cada
              região, e não apenas a uma leitura genérica do Paraná.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-10" style={{ background: BRAND.navy }}>
        <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoClara} alt="Sergio Moro 22 - Governador" className="h-10" />
          <p className="text-white/50 text-xs text-center md:text-right">
            Paraná, a nossa fortaleza! — Metodologia do Plano de Governo, construída com o Paraná.
          </p>
        </div>
      </footer>
    </div>
  );
}
