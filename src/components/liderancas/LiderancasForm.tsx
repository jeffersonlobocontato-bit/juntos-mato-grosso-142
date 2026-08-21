import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, CheckCircle, Share2, MapPin, FileText, Tag, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SocialShareButtons from "@/components/landing/SocialShareButtons";
import ProposalConfirmationMap from "./ProposalConfirmationMap";

interface Eixo {
  id: string;
  nome: string;
}

interface Municipio {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
}

interface SubmittedData {
  titulo: string;
  resumo: string;
  eixoNome: string;
  municipioNome: string;
  municipioLat: number;
  municipioLng: number;
}

const LiderancasForm = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<SubmittedData | null>(null);

  // Identificação
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [cargo, setCargo] = useState("");
  const [municipioId, setMunicipioId] = useState("");

  // Proposta
  const [eixoId, setEixoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [conteudoCompleto, setConteudoCompleto] = useState("");
  const [publicoAlvo, setPublicoAlvo] = useState("");
  const [impactoEsperado, setImpactoEsperado] = useState("");

  // Data
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  useEffect(() => {
    fetchEixos();
    fetchMunicipios();
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchEixos = async () => {
    const { data, error } = await supabase
      .from("eixos_tematicos")
      .select("id, nome")
      .order("nome");
    if (!error && data) setEixos(data);
  };

  const fetchMunicipios = async () => {
    const { data, error } = await supabase
      .from("municipios")
      .select("id, nome, latitude, longitude")
      .order("nome");
    if (!error && data) setMunicipios(data);
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email, celular, cargo")
      .eq("id", user.id)
      .single();
    if (!error && data) {
      setNome(data.full_name || "");
      setEmail(data.email || "");
      setCelular(data.celular || "");
      setCargo(data.cargo || "");
    }
  };

  const validateForm = (): boolean => {
    if (!nome.trim()) {
      toast.error("Informe seu nome");
      return false;
    }
    if (!email.trim()) {
      toast.error("Informe seu email");
      return false;
    }
    if (!eixoId) {
      toast.error("Selecione um eixo temático");
      return false;
    }
    if (!titulo.trim()) {
      toast.error("Informe o título da proposta");
      return false;
    }
    if (!conteudoCompleto.trim()) {
      toast.error("Descreva o conteúdo da proposta");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // First, create a lead with the contact info
      const { error: leadError } = await supabase
        .from("leads")
        .insert({
          nome,
          email,
          whatsapp: celular,
          municipio: municipios.find(m => m.id === municipioId)?.nome || null,
          origem: "proposta" as const,
          metadata: {
            tipo: "proposta_politica",
            cargo,
            titulo_proposta: titulo,
            eixo_id: eixoId,
          },
        });

      if (leadError) {
        console.error("Lead creation error:", leadError);
        // Continue even if lead creation fails
      }

      // Then, create the proposal
      // Use a system user ID or the logged-in user's ID
      const autorId = user?.id || "00000000-0000-0000-0000-000000000000";

      const { error: propostaError } = await supabase
        .from("propostas_politicas")
        .insert({
          autor_id: autorId,
          eixo_id: eixoId,
          titulo,
          resumo: resumo || null,
          conteudo_completo: conteudoCompleto,
          publico_alvo: publicoAlvo || null,
          impacto_esperado: impactoEsperado || null,
          status: "rascunho",
          visivel_publico: false,
          ordem_exibicao: 999,
        });

      if (propostaError) {
        throw propostaError;
      }

      // Store submitted data for confirmation screen
      const selectedMunicipio = municipios.find(m => m.id === municipioId);
      const selectedEixo = eixos.find(e => e.id === eixoId);
      
      setSubmittedData({
        titulo,
        resumo: resumo || conteudoCompleto.slice(0, 150) + "...",
        eixoNome: selectedEixo?.nome || "Proposta",
        municipioNome: selectedMunicipio?.nome || "Mato Grosso",
        municipioLat: Number(selectedMunicipio?.latitude) || -15.6014,
        municipioLng: Number(selectedMunicipio?.longitude) || -56.0979,
      });

      setIsSubmitted(true);
      toast.success("Proposta enviada com sucesso!");
    } catch (error) {
      console.error("Error submitting proposal:", error);
      toast.error("Erro ao enviar proposta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitulo("");
    setResumo("");
    setConteudoCompleto("");
    setPublicoAlvo("");
    setImpactoEsperado("");
    setEixoId("");
    setMunicipioId("");
    setSubmittedData(null);
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <section id="formulario" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-card rounded-2xl p-8 md:p-12 shadow-xl border border-border">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-4 text-center">
                Parabéns! Você faz parte de um movimento coletivo!
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-center">
                Sua voz será ouvida. Juntos estamos construindo um Paraná que respeita todos os seus 399 municípios.
              </p>

              {/* Proposal Summary Card */}
              {submittedData && (
                <>
                  <Card className="mb-6 bg-muted/50 border-border">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-500" />
                        Resumo da Sua Proposta
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Tag className="w-4 h-4 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-xs text-muted-foreground">Título</p>
                            <p className="font-medium text-foreground">{submittedData.titulo}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-4 h-4 rounded-full bg-emerald-500 mt-1" />
                          <div>
                            <p className="text-xs text-muted-foreground">Eixo Temático</p>
                            <p className="font-medium text-foreground">{submittedData.eixoNome}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-xs text-muted-foreground">Município</p>
                            <p className="font-medium text-foreground">{submittedData.municipioNome}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Map */}
                  <div className="mb-6">
                    <ProposalConfirmationMap
                      municipioNome={submittedData.municipioNome}
                      latitude={submittedData.municipioLat}
                      longitude={submittedData.municipioLng}
                      eixoNome={submittedData.eixoNome}
                      titulo={submittedData.titulo}
                    />
                  </div>
                </>
              )}

              {/* CTA to Dashboard */}
              <Link to="/dashboard" className="block mb-6">
                <Button
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Veja o Paraná Todo
                </Button>
              </Link>

              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Compartilhe com outras lideranças:
                </p>
                <SocialShareButtons />
              </div>

              <Button onClick={resetForm} variant="outline" size="lg" className="w-full">
                Enviar Outra Proposta
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="formulario" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Formulário de Proposta
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Envie sua
            <span className="text-primary"> Proposta Política</span>
          </h2>
          <p className="text-muted-foreground">
            Preencha o formulário abaixo para contribuir com uma proposta para o Plano de Governo do Paraná.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
            {/* Identificação */}
            <div className="mb-8">
              <h3 className="font-display font-bold text-lg text-foreground mb-4 pb-2 border-b border-border">
                Identificação
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular/WhatsApp</Label>
                  <Input
                    id="celular"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="(41) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo/Função</Label>
                  <Input
                    id="cargo"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ex: Prefeito, Secretário, Vereador"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="municipio">Município de atuação</Label>
                  <Select value={municipioId} onValueChange={setMunicipioId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu município" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {municipios.map((mun) => (
                        <SelectItem key={mun.id} value={mun.id}>
                          {mun.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Proposta */}
            <div className="mb-8">
              <h3 className="font-display font-bold text-lg text-foreground mb-4 pb-2 border-b border-border">
                Proposta Política
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eixo">Eixo Temático *</Label>
                  <Select value={eixoId} onValueChange={setEixoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o eixo" />
                    </SelectTrigger>
                    <SelectContent>
                      {eixos.map((eixo) => (
                        <SelectItem key={eixo.id} value={eixo.id}>
                          {eixo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título da Proposta *</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Programa de Valorização dos Profissionais de Saúde"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resumo">Resumo (máx. 300 caracteres)</Label>
                  <Textarea
                    id="resumo"
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value.slice(0, 300))}
                    placeholder="Breve descrição da proposta..."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {resumo.length}/300
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conteudo">Conteúdo Completo *</Label>
                  <Textarea
                    id="conteudo"
                    value={conteudoCompleto}
                    onChange={(e) => setConteudoCompleto(e.target.value)}
                    placeholder="Descreva sua proposta em detalhes: objetivos, ações necessárias, recursos envolvidos..."
                    rows={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publico">Público-Alvo</Label>
                  <Input
                    id="publico"
                    value={publicoAlvo}
                    onChange={(e) => setPublicoAlvo(e.target.value)}
                    placeholder="Ex: Jovens em situação de vulnerabilidade social"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impacto">Impacto Esperado</Label>
                  <Textarea
                    id="impacto"
                    value={impactoEsperado}
                    onChange={(e) => setImpactoEsperado(e.target.value)}
                    placeholder="Quais resultados você espera alcançar com esta proposta?"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Enviar Proposta
                </span>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default LiderancasForm;
