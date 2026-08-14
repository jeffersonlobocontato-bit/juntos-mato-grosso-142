import "@/styles/jp399.css";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { trackSugestaoLead } from "@/lib/metaPixel";
import { hasAdsConsent } from "@/lib/cookieConsent";
import AudioRecorderBlock from "./AudioRecorderBlock";
import SuggestionConfirmationMap from "@/components/landing/SuggestionConfirmationMap";
import SocialShareButtons from "@/components/landing/SocialShareButtons";

interface Municipio { id: string; nome: string; latitude: number | null; longitude: number | null; }

const LIMITE = 600;
import { BASE_SUGESTOES } from "@/lib/sugestoesCounter";

const BASE_FAKE = BASE_SUGESTOES;

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, d.length > 10 ? 7 : 6)}-${d.slice(d.length > 10 ? 7 : 6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length) return `(${d}`;
  return "";
}

function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const HomeHero = () => {
  const { toast } = useToast();
  const { trackComponentClick, trackFormSubmit } = useAnalytics();

  const [modo, setModo] = useState<"texto" | "audio">("texto");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [opiniao, setOpiniao] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentAds, setConsentAds] = useState(false);
  const [flash, setFlash] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState<{
    nome: string; cidade: string; sugestao: string; latitude: number | null; longitude: number | null;
  } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const [realCount, setRealCount] = useState(0);

  useEffect(() => {
    supabase.from("municipios").select("id, nome, latitude, longitude").order("nome").then(({ data }) => {
      if (data) setMunicipios(data);
    });
  }, []);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const { data } = await supabase.rpc("get_sugestoes_formulario_count");
      if (!cancel && data != null) setRealCount(Number(data) || 0);
    };
    load();
    const id = setInterval(load, 30000);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const totalCount = BASE_FAKE + realCount;
  const countAnim = useCountUp(totalCount, 1400);
  const munAnim = useCountUp(399, 1400);

  const isValid = useMemo(() =>
    nome.trim().length > 0 &&
    cidade.trim().length > 0 &&
    whatsapp.trim().length >= 8 &&
    (modo === "audio" || opiniao.trim().length >= 10) &&
    consent,
    [nome, cidade, whatsapp, opiniao, consent, modo]
  );

  const handleTranscript = (text: string) => {
    setOpiniao(prev => prev ? `${prev}\n\n${text}` : text);
    toast({ title: "Transcrição adicionada", description: "Revise antes de enviar." });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFlash(null);
    trackComponentClick("OpinionForm", "submit_click");
    if (!nome.trim()) return setFlash({ tipo: "erro", texto: "Preencha seu nome completo." });
    if (whatsapp.replace(/\D/g, "").length < 8) return setFlash({ tipo: "erro", texto: "Informe um telefone válido." });
    if (!cidade.trim()) return setFlash({ tipo: "erro", texto: "Selecione a sua cidade." });
    if (opiniao.trim().length < 10) return setFlash({ tipo: "erro", texto: "Escreva sua opinião (mín. 10 caracteres)." });
    if (!consent) return setFlash({ tipo: "erro", texto: "Marque a autorização de uso da opinião." });

    setEnviando(true);
    const sugestaoId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { error } = await supabase.from("sugestoes_populares").insert({
      id: sugestaoId,
      nome: nome || null,
      whatsapp: whatsapp || null,
      municipio: cidade,
      eixo: "Geral",
      descricao: opiniao,
      publico: true,
    });
    setEnviando(false);
    if (error) {
      setFlash({ tipo: "erro", texto: "Não conseguimos enviar agora. Tente novamente em instantes." });
      trackFormSubmit("OpinionForm", false);
      return;
    }
    supabase.functions.invoke("classify-suggestion-eixo", {
      body: { sugestao_id: sugestaoId, descricao: opiniao },
    }).catch(() => {});
    if (consentAds || hasAdsConsent()) {
      trackSugestaoLead({ municipio: cidade, nome, telefone: whatsapp });
    }
    const mun = municipios.find(m => m.nome === cidade);
    setSubmitted({
      nome, cidade, sugestao: opiniao,
      latitude: mun?.latitude ?? null,
      longitude: mun?.longitude ?? null,
    });
    setSent(true);
    trackFormSubmit("OpinionForm", true);
    setFlash({ tipo: "ok", texto: "Opinião enviada. Obrigado por ajudar a construir o Paraná!" });
  };

  const scrollToForm = () => {
    document.getElementById("participar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetAll = () => {
    setSent(false); setSubmitted(null); setShowMap(false);
    setNome(""); setWhatsapp(""); setCidade(""); setOpiniao(""); setConsent(false); setConsentAds(false); setFlash(null);
  };

  const revealMap = () => {
    trackComponentClick("ConfirmationMap", "reveal_pin_click");
    setShowMap(true);
    setTimeout(() => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const handleGeolocate = () => {
    trackComponentClick("OpinionForm", "geolocate_click");
    if (!("geolocation" in navigator)) {
      setFlash({ tipo: "erro", texto: "Geolocalização indisponível neste dispositivo." });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          let melhor: { nome: string; dist: number } | null = null;
          for (const m of municipios) {
            if (m.latitude == null || m.longitude == null) continue;
            const dLat = Number(m.latitude) - latitude;
            const dLon = Number(m.longitude) - longitude;
            const dist = dLat * dLat + dLon * dLon;
            if (!melhor || dist < melhor.dist) melhor = { nome: m.nome, dist };
          }
          if (melhor) {
            setCidade(melhor.nome);
            setFlash({ tipo: "ok", texto: `Cidade detectada: ${melhor.nome}` });
          } else {
            setFlash({ tipo: "erro", texto: "Não foi possível detectar sua cidade." });
          }
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setFlash({ tipo: "erro", texto: "Permissão de geolocalização negada." });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const hasCoords = submitted?.latitude != null && submitted?.longitude != null &&
    Number.isFinite(Number(submitted.latitude)) && Number.isFinite(Number(submitted.longitude));

  return (
    <div className="jp399" data-component="HomeHero">
      <header className={`topbar`} data-scrolled={scrolled ? "true" : "false"}>
        <div className="wrap topbar__in">
          <a className="logo" href="#topo" aria-label="Juntos Paraná 399">
            <img src="/jp399/logo-nova.svg" alt="Juntos Paraná 399" width={1434} height={514} />
          </a>
          <button
            className="burger"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" width={24} height={24}>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <nav className="menu" data-open={menuOpen ? "true" : "false"} onClick={(e) => e.stopPropagation()}>
            <a href="#participar" onClick={() => setMenuOpen(false)}>Enviar minha opinião</a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
            <a href="/politica-privacidade" onClick={() => setMenuOpen(false)}>Privacidade e LGPD</a>
          </nav>
        </div>
      </header>

      <main id="topo">
        {/* HERO + FORM */}
        <section className="hero" id="participar">
          <img className="hero__photo" src="/jp399/hero-moro.webp" alt="Sergio Moro" width={751} height={850} />
          <div className="wrap hero__in">
            <div className="hero__copy">
              <h1 className="reveal in" style={{ ["--i" as never]: 1 }}>
                Sua voz&nbsp;<br />transforma<br />o futuro do Paraná.
              </h1>
              <p className="hero__sub reveal in" style={{ ["--i" as never]: 2 }}>
                Em <strong>menos de 2 minutos</strong>, diga o que o Paraná precisa mudar.
              </p>
            </div>

            <form className="formcard reveal in" style={{ ["--i" as never]: 3 }} onSubmit={handleSubmit} noValidate>
              <div className="grainlayer" />
              {!sent && (
                <>
                  <div className="tabs" role="tablist" data-active={modo}>
                    <span className="tabs__pill" aria-hidden />
                    <button type="button" className="tab" role="tab" aria-selected={modo === "texto"} onClick={() => setModo("texto")}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.4 3.6a2 2 0 0 1 2.8 2.8L7.3 18.3l-3.8 1 1-3.8z" /></svg>
                      Escrever
                    </button>
                    <button type="button" className="tab" role="tab" aria-selected={modo === "audio"} onClick={() => setModo("audio")}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" /></svg>
                      Falar
                    </button>
                  </div>

                  {modo === "texto" ? (
                    <div className="ta">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                      <textarea
                        maxLength={LIMITE}
                        aria-label="Sua opinião"
                        placeholder="O que você mudaria ou melhoraria no Paraná?"
                        value={opiniao}
                        onChange={(e) => setOpiniao(e.target.value)}
                      />
                      <span className="ta__count" aria-live="polite">{opiniao.length}/{LIMITE}</span>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <AudioRecorderBlock onTranscript={handleTranscript} />
                    </div>
                  )}

                  <div className="grid2 grid3">
                    <div className="field">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <input type="text" required maxLength={100} autoComplete="name" placeholder="Nome completo *"
                        aria-label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
                    </div>
                    <div className="field">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                      <select required aria-label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)}>
                        <option value="" disabled>Cidade *</option>
                        {municipios.map((m) => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                      </select>
                      <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeolocate}
                    disabled={geoLoading}
                    style={{
                      marginTop: 8,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      height: 44,
                      padding: "0 18px",
                      borderRadius: 999,
                      border: "1.5px solid var(--jp-primary, #0a5c36)",
                      background: "rgba(10, 92, 54, 0.08)",
                      color: "var(--jp-primary, #0a5c36)",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: geoLoading ? "wait" : "pointer",
                      opacity: geoLoading ? 0.7 : 1,
                    }}
                    aria-label="Detectar minha cidade pela geolocalização"
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    {geoLoading ? "Detectando..." : "Geolocalizar minha cidade"}
                  </button>

                  <div className="field field--zap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12.02 2.5a9.44 9.44 0 0 0-8.1 14.28L2.5 21.5l4.85-1.38A9.44 9.44 0 1 0 12.02 2.5z" />
                    </svg>
                    <input type="tel" required maxLength={20} inputMode="tel" autoComplete="tel"
                      placeholder="WhatsApp *" aria-label="WhatsApp"
                      value={whatsapp} onChange={(e) => setWhatsapp(mascaraTelefone(e.target.value))} />
                  </div>
                  <p className="field__hint">Enviaremos a prestação de contas da construção do Plano de Governo. Nunca enviamos spam.</p>

                  <div className="actions">
                    <div className="consent">
                      <input id="jp-consent" type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                      <label htmlFor="jp-consent">
                        Li e concordo com a <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a> e os{" "}
                        <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer">Termos de Uso</a>, declaro ser maior de 18 anos e autorizo o uso da minha opinião para fins de construção do Plano de Governo.
                      </label>
                    </div>
                    <div className="consent">
                      <input id="jp-consent-ads" type="checkbox" checked={consentAds} onChange={(e) => setConsentAds(e.target.checked)} />
                      <label htmlFor="jp-consent-ads">
                        Autorizo (opcional) o compartilhamento do meu nome, telefone e cidade com o Meta.
                      </label>
                    </div>
                    <button type="submit" className="submit" disabled={enviando || !isValid}>
                      <span className="submit__ico">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                      </span>
                      <span className="submit__txt">{enviando ? "Enviando..." : "Enviar minha opinião"}</span>
                    </button>
                  </div>

                  <p className="privacy" id="privacidade">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Seus dados são protegidos pela LGPD. Sua opinião é lida pela equipe e vira prioridade no plano.
                  </p>

                  {flash && (
                    <p className="flash" data-show="true" data-kind={flash.tipo} role="status">
                      {flash.tipo === "ok"
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16.5v.01" /></svg>}
                      <span>{flash.texto}</span>
                    </p>
                  )}
                </>
              )}

              {sent && submitted && (
                <div style={{ padding: "6px 4px", color: "#fff", textAlign: "center" }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", margin: "6px auto 14px" }}>
                    <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </div>
                  <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-.02em" }}>
                    Obrigado{submitted.nome ? `, ${submitted.nome.split(/\s+/)[0]}` : ""}!
                  </h3>
                  <p style={{ marginTop: 8, color: "rgba(236,243,236,.8)", fontSize: 15, lineHeight: 1.5 }}>
                    Sua opinião foi registrada e vai ajudar a construir o Plano de Governo do Paraná.
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
                    {hasCoords && !showMap && (
                      <button type="button" onClick={revealMap} className="submit" style={{ marginTop: 0, width: "auto", padding: "0 22px" }}>
                        <span className="submit__ico"><svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg></span>
                        <span className="submit__txt">Ver meu pin no mapa</span>
                      </button>
                    )}
                    <button type="button" onClick={resetAll} className="submit" style={{ marginTop: 0, width: "auto", padding: "0 22px", background: "transparent", color: "#fff", border: "1.5px solid rgba(255,255,255,.35)", boxShadow: "none" }}>
                      <span className="submit__txt">Enviar outra opinião</span>
                    </button>
                  </div>
                  <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.18)" }}>
                    <h4 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 18, color: "#00A85A", marginBottom: 6 }}>
                      Envie e convide amigos e familiares
                    </h4>
                    <p style={{ color: "rgba(236,243,236,.8)", fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>
                      Chame quem você quer ver participando da construção do Plano de Governo do Paraná.
                    </p>
                    <SocialShareButtons
                      variant="compact"
                      message="Acabei de enviar minha opinião para o Plano de Governo do Paraná no Juntos Paraná 399. Participe você também! 🌲"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Confirmation map (outside the card) */}
        {sent && hasCoords && showMap && submitted && (
          <section className="wrap" ref={mapRef} style={{ marginTop: 20 }} data-component="ConfirmationMap">
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <h4 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--forest)" }}>
                Aqui está o seu pin em {submitted.cidade}
              </h4>
              <p style={{ color: "var(--slate)", fontSize: 14 }}>Clique no pin para abrir o registro da sua sugestão.</p>
            </div>
            <SuggestionConfirmationMap
              municipioNome={submitted.cidade}
              latitude={Number(submitted.latitude)}
              longitude={Number(submitted.longitude)}
              nome={submitted.nome}
              sugestao={submitted.sugestao}
              height={420}
            />
          </section>
        )}

        {/* NÚMEROS — contador ao vivo */}
        <section className="stats" data-component="LiveCounter">
          <div className="wrap">
            <p className="stats__intro reveal in">Milhares de paranaenses já participaram. Falta a sua voz.</p>
            <div className="stats__box reveal in">
              <div className="grainlayer" />
              <div className="stat">
                <span className="stat__num" aria-live="polite">{countAnim.toLocaleString("pt-BR")}</span>
                <span className="stat__label"><b>opiniões</b> recebidas de todo o Paraná</span>
              </div>
              <div className="stat">
                <span className="stat__num">{munAnim}</span>
                <span className="stat__label"><b>municípios</b> paranaenses representados</span>
              </div>
              <div className="stat">
                <span className="stat__num">2<i>min</i></span>
                <span className="stat__label"><b>rápido</b>: participe em menos de 2 minutos</span>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="how" id="como-funciona">
          <div className="wrap">
            <div className="how__head">
              <span className="eyebrow">Como funciona</span>
              <h2>Do que você escreve, ao Plano de Governo do Paraná.</h2>
            </div>
            <div className="timeline line-in">
              {[
                { n: 1, t: "Participe", d: "Envie suas ideias, opiniões e sugestões sobre o Paraná." },
                { n: 2, t: "Priorize", d: "As contribuições ajudam a definir o que é mais urgente." },
                { n: 3, t: "Planeje", d: "Transformamos as ideias em propostas concretas e viáveis." },
                { n: 4, t: "Acompanhe", d: "Você acompanha cada etapa e o impacto da sua participação." },
              ].map((s, i) => (
                <div key={s.n} className="tstep reveal in" style={{ ["--i" as never]: i }}>
                  <div className="tstep__rail">
                    <span className="tnode">
                      <span className="tnum">{s.n}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></svg>
                    </span>
                  </div>
                  <div className="tstep__body">
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="final">
          <div className="wrap">
            <div className="final__card reveal in">
              <img className="final__bg" src="/jp399/cta-paisagem.webp" alt="" aria-hidden loading="lazy" />
              <div className="grainlayer" />
              <div className="final__lead">
                <h2>Participe hoje.<em>Transforme o amanhã.</em></h2>
                <p className="final__sub">Sua opinião faz o Paraná avançar.</p>
              </div>
              <div className="final__badge">
                <div className="badge">
                  <svg className="badge__ring" viewBox="0 0 132 132" aria-hidden>
                    <defs><path id="jp-anel" d="M66,66 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" /></defs>
                    <text><textPath href="#jp-anel" startOffset="0">QUERO PARTICIPAR · QUERO PARTICIPAR · </textPath></text>
                  </svg>
                  <button type="button" className="badge__btn" aria-label="Quero participar" onClick={scrollToForm}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="foot">
          <div className="wrap">
            <img className="foot__logo" src="/jp399/logo-nova.svg" alt="Juntos Paraná 399" width={1434} height={514} loading="lazy" />
            Em conformidade com a LGPD (Lei nº 13.709/2018), nome, telefone e cidade não são divulgados publicamente
            nem usados para fins comerciais. Não são compartilhados com terceiros, exceto com a Meta e apenas quando
            você autoriza expressamente no formulário de envio.<br />
            Consulta, correção ou exclusão dos seus dados:{" "}
            <a href="mailto:sergiomoro@juntosparana399.com.br">sergiomoro@juntosparana399.com.br</a>
            <div style={{ marginTop: 28, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.15)", textAlign: "center" }}>
              <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22, color: "#00A85A", marginBottom: 6, letterSpacing: "-.01em" }}>
                Envie e convide seus amigos e familiares
              </h3>
              <p style={{ color: "rgba(236,243,236,.75)", fontSize: 14, lineHeight: 1.55, maxWidth: 560, margin: "0 auto 16px" }}>
                Participe da construção do Plano de Governo do Paraná. Compartilhe agora com quem você quer ver contribuindo para o futuro do nosso estado.
              </p>
              <SocialShareButtons
                message="Participe do Juntos Paraná 399 e ajude a construir o Plano de Governo do Paraná. Sua voz transforma o futuro do nosso estado! 🌲"
              />
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HomeHero;