import { useEffect, useRef, useState } from "react";
import { User, Phone, MapPin, MessageCircle, Send, Edit3, CheckCircle2, Loader2, MapPinned } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioRecorderBlock from "./AudioRecorderBlock";
import SuggestionConfirmationMap from "@/components/landing/SuggestionConfirmationMap";

interface Municipio { id: string; nome: string; latitude: number | null; longitude: number | null; }

const schema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome completo").max(100),
  telefone: z.string().trim().min(8, "Informe um telefone válido").max(20),
  cidade: z.string().trim().min(1, "Selecione sua cidade").max(100),
  sugestao: z.string().trim().min(10, "Conte sua sugestão (mín. 10 caracteres)").max(2000),
});

const OpinionFormCard = () => {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
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
    const parsed = schema.safeParse({ nome, telefone, cidade, sugestao });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Verifique os campos.";
      toast({ title: "Campos obrigatórios", description: msg, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("sugestoes_populares")
      .insert({
        nome: nome || null,
        whatsapp: telefone || null,
        municipio: cidade,
        eixo: "Geral",
        descricao: sugestao,
        publico: true,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.id) {
      supabase.functions.invoke("classify-suggestion-eixo", {
        body: { sugestao_id: data.id, descricao: sugestao },
      }).catch(() => {});
    }
    const municipio = municipios.find((m) => m.nome === cidade);
    setSubmitted({
      nome,
      cidade,
      sugestao,
      latitude: municipio?.latitude ?? null,
      longitude: municipio?.longitude ?? null,
    });
    setSent(true);
    toast({ title: "Opinião enviada!", description: "Obrigado por participar do Paraná." });
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

    const scrollToMap = () => {
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const resetAll = () => {
      setSent(false);
      setSubmitted(null);
      setNome("");
      setTelefone("");
      setCidade("");
      setSugestao("");
    };

    return (
      <div className="space-y-6">
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
            {hasCoords && (
              <button
                onClick={scrollToMap}
                className="h-12 px-6 rounded-full bg-gradient-cta text-primary-foreground font-display font-bold inline-flex items-center justify-center gap-2 shadow-card-float hover:brightness-110 transition"
              >
                <MapPinned className="h-5 w-5" />
                Ver minha opinião no mapa
              </button>
            )}
            <button
              onClick={resetAll}
              className="h-12 px-6 rounded-full border border-border bg-card text-foreground font-semibold hover:bg-muted/50 transition"
            >
              Enviar outra opinião
            </button>
          </div>
        </div>

        {hasCoords && submitted && (
          <div ref={mapRef} id="minha-opiniao-no-mapa" className="scroll-mt-24 space-y-3">
            <div className="text-center space-y-1">
              <h4 className="font-display font-bold text-xl text-foreground">
                Sua opinião está registrada em {submitted.cidade}
              </h4>
              <p className="text-sm text-muted-foreground">
                Clique no marcador para ver os detalhes da sua contribuição.
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
          <select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="input-pill appearance-none bg-card"
            aria-label="Cidade"
            required
          >
            <option value="">Cidade *</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.nome}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <MessageCircle className="absolute left-4 top-4 h-5 w-5 text-primary" />
          <textarea
            placeholder="Conte suas ideias, sugestões e opiniões para o futuro do Paraná..."
            value={sugestao}
            maxLength={2000}
            onChange={(e) => setSugestao(e.target.value)}
            className="textarea-pill"
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