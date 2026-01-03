import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  User, 
  Users,
  MapPin, 
  Layers, 
  FileText,
  Target,
  BarChart3,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Eixo {
  id: string;
  nome: string;
}

interface Municipio {
  id: string;
  nome: string;
}

const steps = [
  { id: 1, label: "Identificação", icon: User },
  { id: 2, label: "Contexto", icon: Layers },
  { id: 3, label: "Conteúdo", icon: FileText },
  { id: 4, label: "Indicadores", icon: BarChart3 },
];

const EntrevistaForm = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [liderNome, setLiderNome] = useState<string>("");
  
  const [formData, setFormData] = useState({
    entrevistado: "",
    municipio_id: "",
    eixo_id: "",
    titulo: "",
    descricao: "",
    metas: "",
    indicadores: "",
  });

  useEffect(() => {
    fetchEixos();
    fetchMunicipios();
    if (user) {
      fetchLiderNome();
    }
  }, [user]);

  const fetchEixos = async () => {
    const { data } = await supabase
      .from("eixos_tematicos")
      .select("id, nome")
      .order("nome");
    if (data) setEixos(data);
  };

  const fetchMunicipios = async () => {
    const { data } = await supabase
      .from("municipios")
      .select("id, nome")
      .order("nome");
    if (data) setMunicipios(data);
  };

  const fetchLiderNome = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (data?.full_name) setLiderNome(data.full_name);
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.entrevistado.trim()) {
          toast.error("Informe o nome do entrevistado");
          return false;
        }
        if (!formData.municipio_id) {
          toast.error("Selecione o município");
          return false;
        }
        return true;
      case 2:
        if (!formData.eixo_id) {
          toast.error("Selecione o eixo temático");
          return false;
        }
        if (!formData.titulo.trim()) {
          toast.error("Informe o título da proposta");
          return false;
        }
        return true;
      case 3:
        if (!formData.descricao.trim()) {
          toast.error("Descreva a proposta");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase.from("propostas_tecnicas").insert({
      entrevistado: formData.entrevistado,
      municipio_id: formData.municipio_id,
      eixo_id: formData.eixo_id,
      titulo: formData.titulo,
      descricao: formData.descricao,
      metas: formData.metas || null,
      indicadores: formData.indicadores || null,
      autor_id: user.id,
      lider_responsavel_id: user.id,
      status: "rascunho",
      etapa: 1,
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      toast.error("Erro ao registrar proposta. Tente novamente.");
    } else {
      toast.success("Proposta registrada com sucesso!");
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      entrevistado: "",
      municipio_id: "",
      eixo_id: "",
      titulo: "",
      descricao: "",
      metas: "",
      indicadores: "",
    });
    setCurrentStep(1);
  };

  const getEixoNome = () => eixos.find(e => e.id === formData.eixo_id)?.nome || "";
  const getMunicipioNome = () => municipios.find(m => m.id === formData.municipio_id)?.nome || "";

  return (
    <section id="formulario" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
            Formulário de Entrevista
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Registrar Proposta Técnica
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Preencha os dados da entrevista de forma guiada. O entrevistado pode 
            acompanhar as informações do projeto ao lado.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-3">
              <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6 md:p-8">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            currentStep >= step.id
                              ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {currentStep > step.id ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <step.icon className="w-5 h-5" />
                          )}
                        </div>
                        <span className={cn(
                          "text-xs mt-2 font-medium hidden sm:block",
                          currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={cn(
                          "w-8 sm:w-16 h-0.5 mx-2",
                          currentStep > step.id ? "bg-primary" : "bg-muted"
                        )} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-[280px]"
                  >
                    {currentStep === 1 && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="entrevistado" className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            Nome do Entrevistado *
                          </Label>
                          <Input
                            id="entrevistado"
                            value={formData.entrevistado}
                            onChange={(e) => setFormData({ ...formData, entrevistado: e.target.value })}
                            placeholder="Nome completo do técnico entrevistado"
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="municipio" className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            Município *
                          </Label>
                          <Select
                            value={formData.municipio_id}
                            onValueChange={(value) => setFormData({ ...formData, municipio_id: value })}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Selecione o município" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {municipios.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-muted-foreground">
                            Líder Técnico Responsável
                          </Label>
                          <Input
                            value={liderNome || "Carregando..."}
                            disabled
                            className="h-12 bg-muted/50"
                          />
                          <p className="text-xs text-muted-foreground">
                            Preenchido automaticamente com o usuário logado
                          </p>
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="eixo" className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            Eixo Temático *
                          </Label>
                          <Select
                            value={formData.eixo_id}
                            onValueChange={(value) => setFormData({ ...formData, eixo_id: value })}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Selecione o eixo" />
                            </SelectTrigger>
                            <SelectContent>
                              {eixos.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="titulo" className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Título da Proposta *
                          </Label>
                          <Input
                            id="titulo"
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            placeholder="Título conciso e descritivo"
                            className="h-12"
                          />
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="descricao" className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Descrição da Proposta *
                          </Label>
                          <Textarea
                            id="descricao"
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Descreva a proposta em detalhes..."
                            rows={5}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="metas" className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Metas (opcional)
                          </Label>
                          <Textarea
                            id="metas"
                            value={formData.metas}
                            onChange={(e) => setFormData({ ...formData, metas: e.target.value })}
                            placeholder="Quais são as metas a serem alcançadas?"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="indicadores" className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Indicadores (opcional)
                          </Label>
                          <Textarea
                            id="indicadores"
                            value={formData.indicadores}
                            onChange={(e) => setFormData({ ...formData, indicadores: e.target.value })}
                            placeholder="Como medir o sucesso da proposta?"
                            rows={4}
                          />
                        </div>

                        {/* Summary */}
                        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                          <h4 className="font-display font-semibold text-foreground flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary" />
                            Resumo da Proposta
                          </h4>
                          <div className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Entrevistado:</span>
                              <span className="font-medium text-foreground">{formData.entrevistado}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Município:</span>
                              <span className="font-medium text-foreground">{getMunicipioNome()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Eixo:</span>
                              <span className="font-medium text-foreground">{getEixoNome()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Título:</span>
                              <span className="font-medium text-foreground truncate max-w-[200px]">{formData.titulo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </Button>

                  {currentStep < 4 ? (
                    <Button onClick={handleNext} className="gap-2">
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSubmit} 
                      disabled={isSubmitting}
                      className="gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Registrar Proposta
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Institutional Content */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-8 space-y-6">
                <div className="bg-gradient-to-br from-primary/10 via-muted/50 to-accent/10 rounded-2xl p-6 border border-border/50">
                  <h3 className="font-display font-bold text-lg text-foreground mb-3">
                    Sobre a Rota 399
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Uma iniciativa popular que percorre todos os 399 municípios 
                    do Paraná para construir, colaborativamente, um Plano de 
                    Governo com base na participação de especialistas e cidadãos.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">399 Municípios</h4>
                        <p className="text-xs text-muted-foreground">Cobertura estadual completa</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">8 Eixos Temáticos</h4>
                        <p className="text-xs text-muted-foreground">Áreas estratégicas de governo</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">Participação Popular</h4>
                        <p className="text-xs text-muted-foreground">Voz a todos os paranaenses</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-6 border border-border/50">
                  <h3 className="font-display font-bold text-lg text-foreground mb-3">
                    Dicas para a Entrevista
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Seja objetivo e claro na descrição</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Inclua metas mensuráveis quando possível</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Defina indicadores para acompanhamento</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>Contextualize para o município selecionado</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EntrevistaForm;
