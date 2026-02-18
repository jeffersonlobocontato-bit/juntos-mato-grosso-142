import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Send, CheckCircle2, Sparkles, Share2, MapPin, Tag, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SocialShareButtons from "./SocialShareButtons";
import SuggestionConfirmationMap from "./SuggestionConfirmationMap";

const eixos = [
  "Desenvolvimento Social",
  "Desenvolvimento Econômico Sustentável",
  "Desenvolvimento das Cidades e Infraestrutura",
  "Gestão Pública Eficiente",
  "Segurança, Justiça, Combate à Corrupção",
];

interface Municipio {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
}

interface SubmittedData {
  descricao: string;
  eixoNome: string;
  municipioNome: string;
  municipioLat: number;
  municipioLng: number;
}

const SuggestionForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState<SubmittedData | null>(null);
  const { toast } = useToast();
  
  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [eixo, setEixo] = useState("");
  const [descricao, setDescricao] = useState("");
  
  // Municipios from database
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  
  useEffect(() => {
    fetchMunicipios();
  }, []);
  
  const fetchMunicipios = async () => {
    const { data, error } = await supabase
      .from("municipios")
      .select("id, nome, latitude, longitude")
      .order("nome");
    if (!error && data) setMunicipios(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!municipio || !eixo || !descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o município, eixo temático e sua sugestão.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    // Get selected municipio data for map
    const selectedMunicipio = municipios.find(m => m.nome === municipio);
    
    const { error } = await supabase
      .from('sugestoes_populares')
      .insert({
        nome: nome || null,
        email: email || null,
        municipio,
        eixo,
        descricao,
        publico: true,
      });
    
    setIsLoading(false);
    
    if (error) {
      console.error('Error submitting suggestion:', error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar sua sugestão. Tente novamente.",
        variant: "destructive",
      });
      return;
    }
    
    // Store submitted data for confirmation screen
    setSubmittedData({
      descricao: descricao.slice(0, 100) + (descricao.length > 100 ? "..." : ""),
      eixoNome: eixo,
      municipioNome: municipio,
      municipioLat: Number(selectedMunicipio?.latitude) || -25.4284,
      municipioLng: Number(selectedMunicipio?.longitude) || -49.2733,
    });
    
    setIsSubmitted(true);
    
    toast({
      title: "Sugestão enviada com sucesso!",
      description: "Obrigado por participar da construção do Paraná.",
    });
  };

  const resetForm = () => {
    setNome("");
    setEmail("");
    setMunicipio("");
    setEixo("");
    setDescricao("");
    setSubmittedData(null);
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <section id="sugestao" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-[0_20px_50px_-15px_hsl(215_25%_15%_/_0.2)] border border-border/50">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-display text-3xl font-bold text-foreground mb-4 text-center">
                Parabéns! Sua voz será ouvida!
              </h3>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto text-center">
                Sua ideia está no mapa do Paraná! Juntos, estamos construindo o futuro do nosso Estado.
              </p>

              {/* Suggestion Summary Card */}
              {submittedData && (
                <>
                  <Card className="mb-6 bg-muted/50 border-border">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Resumo da Sua Sugestão
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Tag className="w-4 h-4 text-muted-foreground mt-1" />
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
                    <SuggestionConfirmationMap
                      municipioNome={submittedData.municipioNome}
                      latitude={submittedData.municipioLat}
                      longitude={submittedData.municipioLng}
                      eixoNome={submittedData.eixoNome}
                    />
                  </div>
                </>
              )}

              {/* CTA to Dashboard */}
              <Link to="/dashboard" className="block mb-6">
                <Button
                  size="lg"
                  variant="hero"
                  className="w-full gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Veja o Paraná Todo
                </Button>
              </Link>

              {/* Social Share Section */}
              <div className="bg-muted/50 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Share2 className="w-5 h-5 text-primary" />
                  <h4 className="font-display font-bold text-lg text-foreground">
                    Agora convide seus amigos!
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Quanto mais vozes, mais forte o Paraná. Compartilhe!
                </p>
                <SocialShareButtons 
                  message="Acabei de contribuir com o Juntos Paraná 399! Você também pode ajudar a construir o Paraná 🌲"
                  variant="default"
                />
              </div>

              <Button
                onClick={resetForm}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Enviar outra sugestão
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="sugestao" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent-foreground text-sm font-semibold mb-4">
            Participe
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Envie sua
            <span className="text-accent"> Sugestão</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Sua voz importa! Contribua com ideias para o desenvolvimento do Paraná.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <form
            onSubmit={handleSubmit}
            className="bg-card rounded-3xl p-8 md:p-12 shadow-[0_20px_50px_-15px_hsl(215_25%_15%_/_0.2)] border border-border/50"
          >
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Nome <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <Input
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="h-12 rounded-xl border-border/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    E-mail <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-border/50 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Município <span className="text-destructive">*</span>
                  </label>
                  <Select value={municipio} onValueChange={setMunicipio}>
                    <SelectTrigger className="h-12 rounded-xl border-border/50">
                      <SelectValue placeholder="Selecione seu município" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {municipios.map((m) => (
                        <SelectItem key={m.id} value={m.nome}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Eixo Temático <span className="text-destructive">*</span>
                  </label>
                  <Select value={eixo} onValueChange={setEixo}>
                    <SelectTrigger className="h-12 rounded-xl border-border/50">
                      <SelectValue placeholder="Selecione um eixo" />
                    </SelectTrigger>
                    <SelectContent>
                      {eixos.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Sua Sugestão <span className="text-destructive">*</span>
                </label>
                <Textarea
                  required
                  placeholder="Descreva sua ideia para o desenvolvimento do Paraná..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="min-h-[150px] rounded-xl border-border/50 focus:border-primary resize-none"
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-pulse">Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Enviar minha ideia</span>
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default SuggestionForm;
