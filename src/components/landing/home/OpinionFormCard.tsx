import { useEffect, useRef, useState } from "react";
import { User, Phone, MapPin, MessageCircle, Send, Edit3, CheckCircle2, Loader2, MapPinned, LocateFixed } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioRecorderBlock from "./AudioRecorderBlock";
import SuggestionConfirmationMap from "@/components/landing/SuggestionConfirmationMap";
import SocialShareButtons from "@/components/landing/SocialShareButtons";
import { trackSugestaoLead } from "@/lib/metaPixel";
import { useAnalytics } from "@/hooks/useAnalytics";

interface Municipio { id: string; nome: string; latitude: number | null; longitude: number | null; }

const schema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome completo").max(100),
  telefone: z.string().trim().min(8, "Informe um telefone válido").max(20),
  cidade: z.string().trim().min(1, "Selecione sua cidade").max(100),
  sugestao: z.string().trim().min(10, "Conte sua sugestão (mín. 10 caracteres)").max(2000),
});

const OpinionFormCard = () => {
  const { toast } = useToast();
  const { trackComponentClick, trackFormSubmit } = useAnalytics();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [submitted, setSubmitted] = useState<{
    nome: string;
    cidade: string;
    sugestao: string;
    latitude: number | null;
    longitude: number | null;
  } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("municipios").select("id, nome, latitude, longitude").order("nome").then(({ data }) => {
      if (data) setMunicipios(data);
    });
  }, []);

  const isValid =
    nome.trim().length > 0 &&
    telefone.trim().length >= 8 &&
    cidade.trim().length > 0 &&
    sugestao.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackComponentClick("OpinionForm", "submit_click");
    const parsed = schema.safeParse({ nome, telefone, cidade, sugestao });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Verifique os campos.";
      toast({ title: "Campos obrigatórios", description: msg, variant: "destructive" });
      trackFormSubmit("OpinionForm", false);
      return;
    }
    setLoading(true);
    const sugestaoId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { error } = await supabase.from("sugestoes_populares").insert({
      id: sugestaoId,
      nome: nome || null,
      whatsapp: telefone || null,
      municipio: cidade,
      eixo: "Geral",
      descricao: sugestao,
      publico: true,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      trackFormSubmit("OpinionForm", false);
      return;
    }
    supabase.functions.invoke("classify-suggestion-eixo", {
      body: { sugestao_id: sugestaoId, descricao: sugestao },
    }).catch(() => {});
    trackSugestaoLead({ municipio: cidade, nome, telefone });
    const municipio = municipios.find((m) => m.nome === cidade);
    setSubmitted({
      nome,
      cidade,
      sugestao,
      latitude: municipio?.latitude ?? null,
      longitude: municipio?.longitude ?? null,
    });
    setSent(true);
    trackFormSubmit("OpinionForm", true);
    toast({ title: "Opinião enviada!", description: "Obrigado por participar do Paraná." });
  };

  const handleGeolocate = () => {
    trackComponentClick("OpinionForm", "geolocate_click");
    if (!("geolocation" in navigator)) {
      toast({ title: "Geolocalização indisponível", description: "Digite o nome da sua cidade.", variant: "destructive" });
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
            toast({ title: "Cidade detectada", description: melhor.nome });
          } else {
            toast({ title: "Não foi possível detectar", description: "Digite o nome da sua cidade.", variant: "destructive" });
          }
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        toast({ title: "Permissão negada", description: "Digite o nome da sua cidade.", variant: "destructive" });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleTranscript = (text: string) => {
    setSugestao(prev => prev ? `${prev}\n\n${text}` : text);
    toast({ title: "Transcrição adicionada", description: "Revise o texto antes de enviar." });
  };

  if (sent) {
    const firstName = submitted?.nome?.trim().split(/\s+/)[0] || "";
    const hasCoords =
      submitted?.latitude != null &&
      submitted?.longitude != null &&
      Number.isFinite(Number(submitted.latitude)) &&
      Number.isFinite(Number(submitted.longitude));

    const revealMap = () => {
      trackComponentClick("ConfirmationMap", "reveal_pin_click");
      setShowMap(true);
      setTimeout(() => {
        mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };

    const resetAll = () => {
      trackComponentClick("OpinionForm", "reset_after_submit");
      setSent(false);
      setSubmitted(null);
      setShowMap(false);
      setNome("");
      setTelefone("");
      setCidade("");
      setSugestao("");
    };

    return (
      <div data-component="OpinionForm" className="space-y-6">
        <div className="rounded-3xl bg-card p-8 md:p-10 shadow-card-float border border-border/50 text-center space-y-5">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display font-black text-3xl md:text-4xl text-foreground">
              Obrigado{firstName ? `, ${firstName}` : ""}!
            </h3>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Sua opinião foi registrada e vai ajudar a construir o Plano de Governo do Paraná.
              Cada contribuição é lida, analisada e considerada — a sua voz importa.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {hasCoords && !showMap && (
              <button
                onClick={revealMap}
                className="h-12 px-6 rounded-full bg-gradient-cta text-primary-foreground font-display font-bold inline-flex items-center justify-center gap-2 shadow-card-float hover:brightness-110 transition"
              >
                <MapPinned className="h-5 w-5" />
                Ver meu pin no mapa
              </button>
            )}
            <button
              onClick={resetAll}
              className="h-12 px-6 rounded-full border border-border bg-card text-foreground font-semibold hover:bg-muted/50 transition"
            >
              Enviar outra opinião
            </button>
          </div>

          <div className="pt-6 mt-4 border-t border-border/60 space-y-4">
            <div className="space-y-1">
              <h4 className="font-display font-bold text-xl text-foreground">
                Convide amigos e familiares
              </h4>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Quanto mais paranaenses participarem, mais forte fica o Plano de Governo. Compartilhe
                agora e chame quem você quer ver construindo o futuro do Paraná.
              </p>
            </div>
            <SocialShareButtons
              message="Acabei de enviar minha opinião para o Plano de Governo do Paraná no Juntos Paraná 399. Participe você também e ajude a construir o futuro do nosso estado! 🌲"
            />
          </div>
        </div>

        {hasCoords && submitted && showMap && (
          <div ref={mapRef} data-component="ConfirmationMap" id="minha-opiniao-no-mapa" className="scroll-mt-24 space-y-3">
            <div className="text-center space-y-1">
              <h4 className="font-display font-bold text-xl text-foreground">
                Aqui está o seu pin em {submitted.cidade}
              </h4>
              <p className="text-sm text-muted-foreground">
                Clique no pin para abrir a caixa com o registro da sua sugestão.
              </p>
            </div>
            <SuggestionConfirmationMap
              municipioNome={submitted.cidade}
              latitude={Number(submitted.latitude)}
              longitude={Number(submitted.longitude)}
              nome={submitted.nome}
              sugestao={submitted.sugestao}
              height={420}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      data-component="OpinionForm"
      onSubmit={handleSubmit}
      className="rounded-3xl bg-card p-6 md:p-8 shadow-card-float border border-border/50 space-y-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Edit3 className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display font-bold text-lg text-foreground">Registre sua opinião</p>
          <p className="text-sm text-muted-foreground">Ajude a definir prioridades para todos os paranaenses.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <input
            type="text"
            placeholder="Nome completo *"
            value={nome}
            maxLength={100}
            onChange={(e) => setNome(e.target.value)}
            className="input-pill"
            aria-label="Nome completo"
            required
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <input
            type="tel"
            placeholder="Telefone / WhatsApp *"
            value={telefone}
            maxLength={20}
            onChange={(e) => setTelefone(e.target.value)}
            className="input-pill"
            aria-label="Telefone ou WhatsApp"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed pl-2 -mt-1">
          Enviaremos a você a <strong className="text-foreground">prestação de contas</strong> da
          construção da proposta do Plano de Governo.
        </p>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary z-10 pointer-events-none" />
          <input
            type="text"
            list="municipios-list"
            placeholder="Cidade * (digite para buscar)"
            value={cidade}
            maxLength={100}
            onChange={(e) => setCidade(e.target.value)}
            className="input-pill bg-card pr-14"
            aria-label="Cidade"
            autoComplete="off"
            required
          />
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            title="Clique para registrar sua geolocalização"
            aria-label="Detectar minha cidade pela geolocalização"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition disabled:opacity-60 z-10"
          >
            {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </button>
          <datalist id="municipios-list">
            {municipios.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 -mt-1">
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-gradient-cta text-primary-foreground font-display font-bold text-sm shadow-card-float hover:brightness-110 transition disabled:opacity-60"
          >
            {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            Registrar minha geolocalização
          </button>
          <span className="text-xs text-muted-foreground pl-2">ou digite o nome da sua cidade acima.</span>
        </div>
        <div className="relative">
          <div className="absolute -top-2 left-4 z-10 px-2 bg-card text-[11px] font-bold uppercase tracking-wide text-primary">
            Sua sugestão
          </div>
          <MessageCircle className="absolute left-4 top-5 h-5 w-5 text-primary" />
          <textarea
            placeholder="Conte suas ideias, sugestões e opiniões para o futuro do Paraná..."
            value={sugestao}
            maxLength={2000}
            onChange={(e) => setSugestao(e.target.value)}
            className="textarea-pill-highlight"
            aria-label="Sua sugestão"
            required
          />
        </div>
      </div>

      <AudioRecorderBlock onTranscript={handleTranscript} />

      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full h-14 rounded-full bg-gradient-cta text-primary-foreground font-display font-bold text-lg inline-flex items-center justify-center gap-3 shadow-card-float hover:brightness-110 transition disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        Enviar opinião
      </button>

      <p className="text-xs text-muted-foreground leading-relaxed text-center px-2">
        <strong className="text-foreground">Seus dados estão protegidos.</strong> Em conformidade
        com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), as informações enviadas
        neste formulário são utilizadas exclusivamente para registrar sua contribuição ao Plano de
        Governo Colaborativo do Paraná. Nome, telefone e cidade não são divulgados publicamente,
        não são compartilhados com terceiros e não são usados para fins comerciais. Você pode
        solicitar a consulta, correção ou exclusão dos seus dados a qualquer momento pelo e-mail{" "}
        <a href="mailto:sergiomoro@juntosparana399.com.br" className="text-primary underline">
          sergiomoro@juntosparana399.com.br
        </a>
        .
      </p>
    </form>
  );
};

export default OpinionFormCard;