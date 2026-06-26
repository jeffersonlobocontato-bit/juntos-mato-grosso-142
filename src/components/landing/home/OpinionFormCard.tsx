import { useEffect, useState } from "react";
import { User, Phone, MapPin, MessageCircle, Send, Edit3, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioRecorderBlock from "./AudioRecorderBlock";

interface Municipio { id: string; nome: string; }

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

  useEffect(() => {
    supabase.from("municipios").select("id, nome").order("nome").then(({ data }) => {
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
    setSent(true);
    toast({ title: "Opinião enviada!", description: "Obrigado por participar do Paraná." });
  };

  const handleTranscript = (text: string) => {
    setSugestao(prev => prev ? `${prev}\n\n${text}` : text);
    toast({ title: "Transcrição adicionada", description: "Revise o texto antes de enviar." });
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-card p-8 md:p-10 shadow-card-float border border-border/50 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-display font-bold text-2xl text-foreground">Sua voz será ouvida!</h3>
        <p className="text-muted-foreground">Obrigado por contribuir com o futuro do Paraná.</p>
        <button
          onClick={() => { setSent(false); setNome(""); setTelefone(""); setCidade(""); setSugestao(""); }}
          className="text-primary font-semibold hover:underline text-sm"
        >
          Enviar outra opinião
        </button>
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
            placeholder="Nome completo"
            value={nome}
            maxLength={100}
            onChange={(e) => setNome(e.target.value)}
            className="input-pill"
            aria-label="Nome completo"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <input
            type="tel"
            placeholder="Telefone / WhatsApp"
            value={telefone}
            maxLength={20}
            onChange={(e) => setTelefone(e.target.value)}
            className="input-pill"
            aria-label="Telefone ou WhatsApp"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary z-10 pointer-events-none" />
          <select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="input-pill appearance-none bg-card"
            aria-label="Cidade"
          >
            <option value="">Cidade</option>
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
    </form>
  );
};

export default OpinionFormCard;