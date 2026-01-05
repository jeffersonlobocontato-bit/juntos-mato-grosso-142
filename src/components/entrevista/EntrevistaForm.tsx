import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  AlertTriangle,
  Target,
  Lightbulb,
  Settings,
  MapPin,
  BarChart3,
  Award,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Eixo {
  id: string;
  nome: string;
}

interface Municipio {
  id: string;
  nome: string;
}

interface QuestionarioData {
  diagnostico: {
    problema_estrutural: string;
    gargalos: string[];
    politicas_existentes: string;
    falhas_politicas: string;
  };
  objetivos: {
    objetivo_estrategico: string;
    resultados_esperados: string[];
  };
  propostas: {
    propostas_estruturantes: string[];
    detalhes_propostas: Array<{
      nome: string;
      problema_resolve: string;
      publico_impactado: string;
    }>;
    caracterizacao: string[];
  };
  implementacao: {
    acoes_concretas: string;
    dependencias: string[];
    risco_principal: string;
    mitigacao_risco: string;
    nivel_custo: string;
  };
  territorializacao: {
    territorios_impactados: string[];
    diferencas_regionais: string;
  };
  indicadores: {
    indicadores_sucesso: string[];
    situacao_atual: string;
    metas_4_anos: string;
    frequencia_monitoramento: string;
  };
  legado: {
    mudanca_permanente: string;
    limites_tecnicos: string;
    observacoes_adicionais: string;
  };
}

const initialQuestionario: QuestionarioData = {
  diagnostico: {
    problema_estrutural: "",
    gargalos: ["", "", ""],
    politicas_existentes: "",
    falhas_politicas: "",
  },
  objetivos: {
    objetivo_estrategico: "",
    resultados_esperados: ["", "", ""],
  },
  propostas: {
    propostas_estruturantes: ["", "", "", "", ""],
    detalhes_propostas: [],
    caracterizacao: [],
  },
  implementacao: {
    acoes_concretas: "",
    dependencias: [],
    risco_principal: "",
    mitigacao_risco: "",
    nivel_custo: "",
  },
  territorializacao: {
    territorios_impactados: [],
    diferencas_regionais: "",
  },
  indicadores: {
    indicadores_sucesso: ["", "", "", ""],
    situacao_atual: "",
    metas_4_anos: "",
    frequencia_monitoramento: "",
  },
  legado: {
    mudanca_permanente: "",
    limites_tecnicos: "",
    observacoes_adicionais: "",
  },
};

const steps = [
  { label: "Identificação", icon: User },
  { label: "Diagnóstico", icon: AlertTriangle },
  { label: "Objetivos", icon: Target },
  { label: "Propostas", icon: Lightbulb },
  { label: "Implementação", icon: Settings },
  { label: "Territorialização", icon: MapPin },
  { label: "Indicadores", icon: BarChart3 },
  { label: "Legado", icon: Award },
];

const caracterizacaoOptions = [
  { value: "nova_politica", label: "Novas políticas públicas" },
  { value: "ampliacao", label: "Ampliação de políticas existentes" },
  { value: "reorganizacao", label: "Reorganização ou integração de estruturas" },
  { value: "mudanca_gestao", label: "Mudança de modelo de gestão" },
];

const dependenciasOptions = [
  { value: "lei_estadual", label: "Lei estadual" },
  { value: "decreto", label: "Decreto ou regulamentação" },
  { value: "reorganizacao_admin", label: "Reorganização administrativa" },
  { value: "parcerias_municipios", label: "Parcerias com municípios" },
  { value: "parcerias_uniao_privado", label: "Parcerias com União ou setor privado" },
  { value: "decisao_gestao", label: "Apenas decisão de gestão" },
];

const territoriosOptions = [
  { value: "todo_estado", label: "Todo o estado de forma homogênea" },
  { value: "regioes_especificas", label: "Regiões específicas do Paraná" },
  { value: "municipios_pequeno_porte", label: "Municípios de pequeno porte" },
  { value: "grandes_centros", label: "Grandes centros urbanos" },
  { value: "populacoes_especificas", label: "Populações ou grupos específicos" },
];

const custoOptions = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

const frequenciaOptions = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const EntrevistaForm = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Identificação
  const [entrevistado, setEntrevistado] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [eixoId, setEixoId] = useState("");

  // Data
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [liderNome, setLiderNome] = useState("");

  // Questionário
  const [questionario, setQuestionario] = useState<QuestionarioData>(initialQuestionario);

  useEffect(() => {
    fetchEixos();
    fetchMunicipios();
    if (user) {
      fetchLiderNome();
    }
  }, [user]);

  // Sync detalhes_propostas with propostas_estruturantes
  useEffect(() => {
    const propostas = questionario.propostas.propostas_estruturantes.filter(p => p.trim() !== "");
    const currentDetalhes = questionario.propostas.detalhes_propostas;
    
    if (propostas.length !== currentDetalhes.length) {
      const newDetalhes = propostas.map((nome, index) => 
        currentDetalhes[index] || { nome, problema_resolve: "", publico_impactado: "" }
      );
      setQuestionario(prev => ({
        ...prev,
        propostas: {
          ...prev.propostas,
          detalhes_propostas: newDetalhes,
        },
      }));
    }
  }, [questionario.propostas.propostas_estruturantes]);

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
      .select("id, nome")
      .order("nome");
    if (!error && data) setMunicipios(data);
  };

  const fetchLiderNome = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (!error && data) setLiderNome(data.full_name || "");
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Identificação
        if (!entrevistado.trim()) {
          toast.error("Informe o nome do entrevistado");
          return false;
        }
        if (!municipioId) {
          toast.error("Selecione o município");
          return false;
        }
        if (!eixoId) {
          toast.error("Selecione o eixo temático");
          return false;
        }
        return true;

      case 1: // Diagnóstico
        if (!questionario.diagnostico.problema_estrutural.trim()) {
          toast.error("Descreva o problema estrutural");
          return false;
        }
        if (!questionario.diagnostico.gargalos.some(g => g.trim())) {
          toast.error("Informe ao menos um gargalo");
          return false;
        }
        return true;

      case 2: // Objetivos
        if (!questionario.objetivos.objetivo_estrategico.trim()) {
          toast.error("Defina o objetivo estratégico");
          return false;
        }
        if (!questionario.objetivos.resultados_esperados.some(r => r.trim())) {
          toast.error("Informe ao menos um resultado esperado");
          return false;
        }
        return true;

      case 3: // Propostas
        if (!questionario.propostas.propostas_estruturantes.some(p => p.trim())) {
          toast.error("Informe ao menos uma proposta estruturante");
          return false;
        }
        return true;

      case 4: // Implementação
        if (!questionario.implementacao.acoes_concretas.trim()) {
          toast.error("Descreva as ações concretas");
          return false;
        }
        if (!questionario.implementacao.risco_principal.trim()) {
          toast.error("Informe o risco principal");
          return false;
        }
        return true;

      case 5: // Territorialização
        if (questionario.territorializacao.territorios_impactados.length === 0) {
          toast.error("Selecione ao menos um território impactado");
          return false;
        }
        return true;

      case 6: // Indicadores
        const indicadoresPreenchidos = questionario.indicadores.indicadores_sucesso.filter(i => i.trim()).length;
        if (indicadoresPreenchidos < 2) {
          toast.error("Informe ao menos 2 indicadores de sucesso");
          return false;
        }
        if (!questionario.indicadores.frequencia_monitoramento) {
          toast.error("Selecione a frequência de monitoramento");
          return false;
        }
        return true;

      case 7: // Legado
        if (!questionario.legado.mudanca_permanente.trim()) {
          toast.error("Descreva a mudança permanente esperada");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    if (!user) {
      toast.error("Você precisa estar logado para enviar");
      return;
    }

    setIsSubmitting(true);

    try {
      const titulo = questionario.objetivos.objetivo_estrategico.substring(0, 200);
      const descricao = questionario.diagnostico.problema_estrutural;
      const metas = questionario.indicadores.metas_4_anos;
      const indicadores = questionario.indicadores.indicadores_sucesso.filter(i => i.trim()).join("\n");

      const { error } = await supabase.from("propostas_tecnicas").insert([{
        autor_id: user.id,
        lider_responsavel_id: user.id,
        eixo_id: eixoId,
        municipio_id: municipioId,
        entrevistado: entrevistado.trim(),
        titulo,
        descricao,
        metas,
        indicadores,
        questionario: JSON.parse(JSON.stringify(questionario)),
        status: "rascunho" as const,
        etapa: 1,
      }]);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Proposta técnica registrada com sucesso!");
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Erro ao registrar proposta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setEntrevistado("");
    setMunicipioId("");
    setEixoId("");
    setQuestionario(initialQuestionario);
    setIsSubmitted(false);
  };

  const updateQuestionario = <K extends keyof QuestionarioData>(
    section: K,
    field: keyof QuestionarioData[K],
    value: QuestionarioData[K][keyof QuestionarioData[K]]
  ) => {
    setQuestionario((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateArrayItem = <K extends keyof QuestionarioData>(
    section: K,
    field: keyof QuestionarioData[K],
    index: number,
    value: string
  ) => {
    setQuestionario((prev) => {
      const currentArray = prev[section][field] as string[];
      const newArray = [...currentArray];
      newArray[index] = value;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray,
        },
      };
    });
  };

  const toggleCheckbox = <K extends keyof QuestionarioData>(
    section: K,
    field: keyof QuestionarioData[K],
    value: string
  ) => {
    setQuestionario((prev) => {
      const currentArray = prev[section][field] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((v) => v !== value)
        : [...currentArray, value];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray,
        },
      };
    });
  };

  if (isSubmitted) {
    return (
      <section id="formulario" className="py-20 bg-black">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Proposta Registrada com Sucesso!
            </h2>
            <p className="text-gray-400 mb-8">
              Sua proposta técnica foi salva e está disponível para análise.
              O questionário estruturado permitirá análise comparativa entre eixos.
            </p>
            <Button onClick={resetForm} variant="hero" size="lg">
              Registrar Nova Proposta
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="entrevistado" className="text-white mb-2 block">
                Nome do Entrevistado *
              </Label>
              <Input
                id="entrevistado"
                value={entrevistado}
                onChange={(e) => setEntrevistado(e.target.value)}
                placeholder="Nome completo do especialista entrevistado"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="municipio" className="text-white mb-2 block">
                Município de Referência *
              </Label>
              <Select value={municipioId} onValueChange={setMunicipioId}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione o município" />
                </SelectTrigger>
                <SelectContent>
                  {municipios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eixo" className="text-white mb-2 block">
                Eixo Temático *
              </Label>
              <Select value={eixoId} onValueChange={setEixoId}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione o eixo temático" />
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

            <div>
              <Label className="text-white mb-2 block">Líder Responsável</Label>
              <Input
                value={liderNome}
                disabled
                className="bg-gray-800 border-gray-700 text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Preenchido automaticamente com seu nome
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q1.</span> Qual é o principal problema estrutural do Paraná neste eixo? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Descreva a causa raiz do problema, não apenas seus sintomas.</p>
              <Textarea
                value={questionario.diagnostico.problema_estrutural}
                onChange={(e) => updateQuestionario("diagnostico", "problema_estrutural", e.target.value)}
                placeholder="Descreva o problema estrutural..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q2.</span> Quais são os três principais gargalos? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Liste gargalos institucionais, operacionais ou legais.</p>
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-primary font-semibold w-24">Gargalo {index + 1}:</span>
                    <Input
                      value={questionario.diagnostico.gargalos[index]}
                      onChange={(e) => updateArrayItem("diagnostico", "gargalos", index, e.target.value)}
                      placeholder={`Descreva o gargalo ${index + 1}`}
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q3.</span> Quais políticas, programas ou leis já existem hoje?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Descreva brevemente o que já está em funcionamento.</p>
              <Textarea
                value={questionario.diagnostico.politicas_existentes}
                onChange={(e) => updateQuestionario("diagnostico", "politicas_existentes", e.target.value)}
                placeholder="Políticas e programas existentes..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q4.</span> Por que essas políticas não produzem os resultados esperados?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Explique falhas de desenho, execução, integração, escala ou governança.</p>
              <Textarea
                value={questionario.diagnostico.falhas_politicas}
                onChange={(e) => updateQuestionario("diagnostico", "falhas_politicas", e.target.value)}
                placeholder="Falhas identificadas..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q5.</span> Qual deve ser o objetivo estratégico central para os próximos 4 anos? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Uma frase clara, orientadora e mensurável.</p>
              <Textarea
                value={questionario.objetivos.objetivo_estrategico}
                onChange={(e) => updateQuestionario("objetivos", "objetivo_estrategico", e.target.value)}
                placeholder="Objetivo estratégico central..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q6.</span> Quais resultados concretos a população deve perceber ao final do mandato? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Liste até três resultados perceptíveis pelo cidadão.</p>
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-primary font-semibold w-24">Resultado {index + 1}:</span>
                    <Input
                      value={questionario.objetivos.resultados_esperados[index]}
                      onChange={(e) => updateArrayItem("objetivos", "resultados_esperados", index, e.target.value)}
                      placeholder={`Resultado ${index + 1}`}
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q7.</span> Quais são as principais propostas estruturantes para este eixo? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Liste de 3 a 5 propostas que promovam mudança estrutural.</p>
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-primary font-semibold w-24">Proposta {index + 1}:</span>
                    <Input
                      value={questionario.propostas.propostas_estruturantes[index]}
                      onChange={(e) => updateArrayItem("propostas", "propostas_estruturantes", index, e.target.value)}
                      placeholder={`Nome da proposta ${index + 1}`}
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {questionario.propostas.propostas_estruturantes.some(p => p.trim()) && (
              <div>
                <Label className="text-white mb-2 block">
                  <span className="text-primary font-semibold">Q8.</span> Para cada proposta, informe:
                </Label>
                <div className="space-y-4">
                  {questionario.propostas.propostas_estruturantes
                    .filter(p => p.trim())
                    .map((proposta, index) => (
                      <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <h4 className="text-primary font-semibold mb-3">{proposta}</h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-gray-300 text-sm">Problema que resolve:</Label>
                            <Input
                              value={questionario.propostas.detalhes_propostas[index]?.problema_resolve || ""}
                              onChange={(e) => {
                                const newDetalhes = [...questionario.propostas.detalhes_propostas];
                                if (!newDetalhes[index]) {
                                  newDetalhes[index] = { nome: proposta, problema_resolve: "", publico_impactado: "" };
                                }
                                newDetalhes[index].problema_resolve = e.target.value;
                                updateQuestionario("propostas", "detalhes_propostas", newDetalhes);
                              }}
                              placeholder="Qual problema resolve..."
                              className="bg-gray-900 border-gray-700 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm">Público impactado:</Label>
                            <Input
                              value={questionario.propostas.detalhes_propostas[index]?.publico_impactado || ""}
                              onChange={(e) => {
                                const newDetalhes = [...questionario.propostas.detalhes_propostas];
                                if (!newDetalhes[index]) {
                                  newDetalhes[index] = { nome: proposta, problema_resolve: "", publico_impactado: "" };
                                }
                                newDetalhes[index].publico_impactado = e.target.value;
                                updateQuestionario("propostas", "detalhes_propostas", newDetalhes);
                              }}
                              placeholder="Quem será impactado..."
                              className="bg-gray-900 border-gray-700 text-white mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q9.</span> Essas propostas se caracterizam como:
              </Label>
              <p className="text-xs text-gray-400 mb-2">Marque todas as opções aplicáveis.</p>
              <div className="space-y-2">
                {caracterizacaoOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`caract-${option.value}`}
                      checked={questionario.propostas.caracterizacao.includes(option.value)}
                      onCheckedChange={() => toggleCheckbox("propostas", "caracterizacao", option.value)}
                      className="border-gray-600"
                    />
                    <Label htmlFor={`caract-${option.value}`} className="text-gray-300 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q10.</span> Quais ações concretas tornam essas propostas executáveis? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Liste ações objetivas de governo. Evite promessas genéricas.</p>
              <Textarea
                value={questionario.implementacao.acoes_concretas}
                onChange={(e) => updateQuestionario("implementacao", "acoes_concretas", e.target.value)}
                placeholder="Ações concretas de implementação..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q11.</span> A implementação dessas propostas depende de:
              </Label>
              <p className="text-xs text-gray-400 mb-2">Marque todas as opções aplicáveis.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {dependenciasOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`dep-${option.value}`}
                      checked={questionario.implementacao.dependencias.includes(option.value)}
                      onCheckedChange={() => toggleCheckbox("implementacao", "dependencias", option.value)}
                      className="border-gray-600"
                    />
                    <Label htmlFor={`dep-${option.value}`} className="text-gray-300 cursor-pointer text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q12.</span> Qual é o principal risco para a implementação? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Descreva o risco mais relevante.</p>
              <Textarea
                value={questionario.implementacao.risco_principal}
                onChange={(e) => updateQuestionario("implementacao", "risco_principal", e.target.value)}
                placeholder="Risco principal..."
                className="bg-gray-900 border-gray-700 text-white min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q13.</span> Como esse risco pode ser mitigado?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Explique a estratégia de mitigação.</p>
              <Textarea
                value={questionario.implementacao.mitigacao_risco}
                onChange={(e) => updateQuestionario("implementacao", "mitigacao_risco", e.target.value)}
                placeholder="Estratégia de mitigação..."
                className="bg-gray-900 border-gray-700 text-white min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q14.</span> Qual o nível estimado de custo incremental?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Avaliação qualitativa.</p>
              <RadioGroup
                value={questionario.implementacao.nivel_custo}
                onValueChange={(value) => updateQuestionario("implementacao", "nivel_custo", value)}
                className="flex gap-6"
              >
                {custoOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`custo-${option.value}`}
                      className="border-gray-600"
                    />
                    <Label htmlFor={`custo-${option.value}`} className="text-gray-300 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q15.</span> Essas propostas impactam quais territórios ou públicos? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Marque todas as opções aplicáveis.</p>
              <div className="space-y-2">
                {territoriosOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`terr-${option.value}`}
                      checked={questionario.territorializacao.territorios_impactados.includes(option.value)}
                      onCheckedChange={() => toggleCheckbox("territorializacao", "territorios_impactados", option.value)}
                      className="border-gray-600"
                    />
                    <Label htmlFor={`terr-${option.value}`} className="text-gray-300 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q16.</span> Quais diferenças regionais devem ser consideradas na implementação?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Aspectos territoriais, socioeconômicos ou logísticos.</p>
              <Textarea
                value={questionario.territorializacao.diferencas_regionais}
                onChange={(e) => updateQuestionario("territorializacao", "diferencas_regionais", e.target.value)}
                placeholder="Diferenças regionais a considerar..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q17.</span> Quais indicadores simples podem medir o sucesso deste eixo? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Liste de 2 a 4 indicadores.</p>
              <div className="space-y-3">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-primary font-semibold w-24">Indicador {index + 1}:</span>
                    <Input
                      value={questionario.indicadores.indicadores_sucesso[index]}
                      onChange={(e) => updateArrayItem("indicadores", "indicadores_sucesso", index, e.target.value)}
                      placeholder={index < 2 ? `Indicador ${index + 1} *` : `Indicador ${index + 1} (opcional)`}
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q18.</span> Qual é a situação atual desses indicadores?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Informe dados atuais ou referência aproximada.</p>
              <Textarea
                value={questionario.indicadores.situacao_atual}
                onChange={(e) => updateQuestionario("indicadores", "situacao_atual", e.target.value)}
                placeholder="Situação atual dos indicadores..."
                className="bg-gray-900 border-gray-700 text-white min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q19.</span> Quais metas devem ser alcançadas ao final de 4 anos?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Defina metas realistas para os indicadores listados.</p>
              <Textarea
                value={questionario.indicadores.metas_4_anos}
                onChange={(e) => updateQuestionario("indicadores", "metas_4_anos", e.target.value)}
                placeholder="Metas para 4 anos..."
                className="bg-gray-900 border-gray-700 text-white min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q20.</span> Com que frequência os resultados devem ser monitorados? *
              </Label>
              <RadioGroup
                value={questionario.indicadores.frequencia_monitoramento}
                onValueChange={(value) => updateQuestionario("indicadores", "frequencia_monitoramento", value)}
                className="flex flex-wrap gap-4"
              >
                {frequenciaOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`freq-${option.value}`}
                      className="border-gray-600"
                    />
                    <Label htmlFor={`freq-${option.value}`} className="text-gray-300 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q21.</span> O que muda de forma permanente no Estado se este eixo for bem executado? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">Descreva o legado institucional e estrutural.</p>
              <Textarea
                value={questionario.legado.mudanca_permanente}
                onChange={(e) => updateQuestionario("legado", "mudanca_permanente", e.target.value)}
                placeholder="Mudança permanente esperada..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q22.</span> O que não deve ser feito neste eixo, mesmo sob pressão política?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Limites técnicos, legais ou estratégicos.</p>
              <Textarea
                value={questionario.legado.limites_tecnicos}
                onChange={(e) => updateQuestionario("legado", "limites_tecnicos", e.target.value)}
                placeholder="Limites e restrições..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">Q23.</span> Há alguma observação técnica adicional relevante?
              </Label>
              <p className="text-xs text-gray-400 mb-2">Campo livre para complementar informações importantes.</p>
              <Textarea
                value={questionario.legado.observacoes_adicionais}
                onChange={(e) => updateQuestionario("legado", "observacoes_adicionais", e.target.value)}
                placeholder="Observações adicionais..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section id="formulario" className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold text-white">
                  Questionário Padrão — Plano de Governo
                </h2>
              </div>
              <p className="text-gray-400">
                Formulário estruturado para análise comparativa entre eixos temáticos
              </p>
            </motion.div>

            {/* Progress Steps */}
            <div className="mb-8 overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;

                  return (
                    <button
                      key={index}
                      onClick={() => index < currentStep && setCurrentStep(index)}
                      disabled={index > currentStep}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${isActive 
                          ? "bg-primary text-black" 
                          : isCompleted 
                            ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30" 
                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{step.label}</span>
                      <span className="sm:hidden">{index + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Content */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="w-6 h-6 text-primary" />;
                })()}
                <h3 className="text-xl font-semibold text-white">
                  {steps[currentStep].label}
                </h3>
                <span className="text-sm text-gray-500 ml-auto">
                  Passo {currentStep + 1} de {steps.length}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
                <Button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button onClick={handleNext} variant="hero">
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    variant="hero"
                    size="lg"
                  >
                    {isSubmitting ? "Enviando..." : "Registrar Proposta"}
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Sobre este Formulário
                </h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>23 perguntas estruturadas para análise comparativa</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Cobertura de diagnóstico a indicadores de resultado</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Padrão único para todos os eixos temáticos</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Dados salvos para consolidação do plano de governo</span>
                  </li>
                </ul>
              </div>

              <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-primary mb-3">
                  Dica para {steps[currentStep].label}
                </h3>
                <p className="text-sm text-gray-300">
                  {currentStep === 0 && "Identifique claramente o entrevistado e o contexto territorial da proposta."}
                  {currentStep === 1 && "Foque na causa raiz, não nos sintomas. Gargalos devem ser específicos e acionáveis."}
                  {currentStep === 2 && "O objetivo deve ser uma frase clara e mensurável que oriente todas as ações do eixo."}
                  {currentStep === 3 && "Propostas estruturantes são aquelas que promovem mudança sistêmica, não apenas ações pontuais."}
                  {currentStep === 4 && "Seja específico sobre ações e dependências. Identifique riscos reais, não genéricos."}
                  {currentStep === 5 && "Considere as diferenças entre regiões do Paraná na implementação das propostas."}
                  {currentStep === 6 && "Indicadores devem ser simples de medir e comunicar. Evite métricas complexas."}
                  {currentStep === 7 && "Pense no legado: o que permanece após o mandato? Quais são os limites éticos e técnicos?"}
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Progresso
                </h3>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400">
                  {currentStep + 1} de {steps.length} seções
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EntrevistaForm;
