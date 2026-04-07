import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Building2,
  Focus,
  Handshake,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
} from "lucide-react";
import { getBlocoFConfig, getProgramaTeste, getExemplosFormulario } from "@/config/entrevistaQuestions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Eixo {
  id: string;
  nome: string;
  ordem?: number;
}

interface Municipio {
  id: string;
  nome: string;
}

interface Tema {
  id: string;
  nome: string;
  codigo: string;
  eixo_id: string;
  ordem?: number;
}

interface Subtema {
  id: string;
  nome: string;
  tema_id: string;
  ordem?: number;
}

interface QuestionarioData {
  aquecimento: {
    area_atuacao_especifica: string;
    principais_desafios: string[];
  };
  o_que_funciona: {
    acoes_manter: string[];
    impacto_parar: string;
  };
  o_que_nao_funciona: {
    causas_raiz: string;
    caso_real: string;
    prioridade_correcao: string;
  };
  parar_substituir: {
    rotinas_ineficientes: string;
    substituicao_proposta: string;
  };
  governanca: {
    planejamento_vs_anuncio: string;
    integracao_estado_municipio: string;
  };
  bloco_f: {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
  };
  cocriacao: {
    entregas_90_dias: string;
    programa_teste: string;
    sugestao_cross_eixo: string;
    cross_eixo_ids: string[];
  };
}

const initialQuestionario: QuestionarioData = {
  aquecimento: {
    area_atuacao_especifica: "",
    principais_desafios: ["", "", ""],
  },
  o_que_funciona: {
    acoes_manter: ["", "", ""],
    impacto_parar: "",
  },
  o_que_nao_funciona: {
    causas_raiz: "",
    caso_real: "",
    prioridade_correcao: "",
  },
  parar_substituir: {
    rotinas_ineficientes: "",
    substituicao_proposta: "",
  },
  governanca: {
    planejamento_vs_anuncio: "",
    integracao_estado_municipio: "",
  },
  bloco_f: {
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
    q6: "",
  },
  cocriacao: {
    entregas_90_dias: "",
    programa_teste: "",
    sugestao_cross_eixo: "",
    cross_eixo_ids: [],
  },
};

const steps = [
  { label: "Identificação", icon: User },
  { label: "Aquecimento", icon: Flame },
  { label: "O que Funciona", icon: ThumbsUp },
  { label: "O que Não Funciona", icon: ThumbsDown },
  { label: "Parar / Substituir", icon: Trash2 },
  { label: "Governança", icon: Building2 },
  { label: "Visão Setorial", icon: Focus },
  { label: "Cocriação", icon: Handshake },
  { label: "Título", icon: FileText },
];

interface EntrevistaFormProps {
  mode?: "tecnica" | "institucional";
}

const SEGMENTOS_INSTITUCIONAIS = [
  "Associação Comercial e Industrial",
  "Conselho Empresarial",
  "Sindicato Patronal",
  "Federação da Indústria",
  "Federação do Comércio",
  "Federação da Agricultura",
  "Cooperativa",
  "Câmara de Dirigentes Lojistas",
  "Outro",
];

const EntrevistaForm = ({ mode = "tecnica" }: EntrevistaFormProps) => {
  const isInstitucional = mode === "institucional";
  const { user, isAdminMaster } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Identificação
  const [entrevistado, setEntrevistado] = useState("");
  const [titulo, setTitulo] = useState("");
  const [entrevistadoEmail, setEntrevistadoEmail] = useState("");
  const [entrevistadoCelular, setEntrevistadoCelular] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [eixoId, setEixoId] = useState("");
  const [eixoLocked, setEixoLocked] = useState(false);
  const [temaId, setTemaId] = useState("");
  const [subtemaIds, setSubtemaIds] = useState<string[]>([]);

  // Campos Institucionais (PJ)
  const [instituicaoNome, setInstituicaoNome] = useState("");
  const [instituicaoCnpj, setInstituicaoCnpj] = useState("");
  const [instituicaoSegmento, setInstituicaoSegmento] = useState("");
  const [representanteNome, setRepresentanteNome] = useState("");
  const [representanteCargo, setRepresentanteCargo] = useState("");
  const [representanteTelefone, setRepresentanteTelefone] = useState("");
  const [representanteEmail, setRepresentanteEmail] = useState("");

  // Data
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [liderNome, setLiderNome] = useState("");

  // Questionário
  const [questionario, setQuestionario] = useState<QuestionarioData>(initialQuestionario);

  // Exemplos contextualizados por eixo
  const exemplos = useMemo(() => getExemplosFormulario(eixoId), [eixoId]);

  // ── DRAFT PERSISTENCE ──
  const DRAFT_KEY = isInstitucional ? "entrevista_institucional_draft" : "entrevista_draft";
  const draftRestored = useRef(false);
  const skipEixoReset = useRef(false);

  // Restore draft on mount
  useEffect(() => {
    if (draftRestored.current) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      draftRestored.current = true;
      skipEixoReset.current = true;

      if (draft.entrevistado) setEntrevistado(draft.entrevistado);
      if (draft.entrevistadoEmail) setEntrevistadoEmail(draft.entrevistadoEmail);
      if (draft.entrevistadoCelular) setEntrevistadoCelular(draft.entrevistadoCelular);
      if (draft.municipioId) setMunicipioId(draft.municipioId);
      if (draft.titulo) setTitulo(draft.titulo);
      if (draft.questionario) setQuestionario(draft.questionario);
      if (typeof draft.currentStep === "number") setCurrentStep(draft.currentStep);
      if (draft.subtemaIds) setSubtemaIds(draft.subtemaIds);
      if (draft.temaId) setTemaId(draft.temaId);
      if (draft.eixoId) setEixoId(draft.eixoId);
      if (draft.eixoLocked) setEixoLocked(draft.eixoLocked);
      // Institutional fields
      if (draft.instituicaoNome) setInstituicaoNome(draft.instituicaoNome);
      if (draft.instituicaoCnpj) setInstituicaoCnpj(draft.instituicaoCnpj);
      if (draft.instituicaoSegmento) setInstituicaoSegmento(draft.instituicaoSegmento);
      if (draft.representanteNome) setRepresentanteNome(draft.representanteNome);
      if (draft.representanteCargo) setRepresentanteCargo(draft.representanteCargo);
      if (draft.representanteTelefone) setRepresentanteTelefone(draft.representanteTelefone);
      if (draft.representanteEmail) setRepresentanteEmail(draft.representanteEmail);

      // Clear the skip flag after React processes state
      setTimeout(() => { skipEixoReset.current = false; }, 100);

      toast.info("Rascunho restaurado", { description: "Seus dados anteriores foram recuperados." });
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // Auto-save draft with debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!draftRestored.current && !entrevistado && !questionario.aquecimento.area_atuacao_especifica) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const draft = {
          entrevistado, entrevistadoEmail, entrevistadoCelular,
          municipioId, eixoId, eixoLocked, temaId, subtemaIds,
          questionario, titulo, currentStep,
          instituicaoNome, instituicaoCnpj, instituicaoSegmento,
          representanteNome, representanteCargo, representanteTelefone, representanteEmail,
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch { /* storage full — ignore */ }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [entrevistado, entrevistadoEmail, entrevistadoCelular, municipioId, eixoId, eixoLocked, temaId, subtemaIds, questionario, titulo, currentStep, instituicaoNome, instituicaoCnpj, instituicaoSegmento, representanteNome, representanteCargo, representanteTelefone, representanteEmail]);

  useEffect(() => {
    fetchEixos();
    fetchMunicipios();
    fetchTemas();
    fetchSubtemas();
    if (user) {
      fetchLiderNome();
      fetchUserEixo();
    }
  }, [user]);

  // Reset tema and subtemas when eixo changes (skip during draft restore)
  useEffect(() => {
    if (skipEixoReset.current) return;
    setTemaId("");
    setSubtemaIds([]);
  }, [eixoId]);

  // Reset subtemas when tema changes (skip during draft restore)
  useEffect(() => {
    if (skipEixoReset.current) return;
    setSubtemaIds([]);
  }, [temaId]);

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

  const fetchTemas = async () => {
    const { data, error } = await supabase
      .from("temas")
      .select("id, nome, codigo, eixo_id, ordem")
      .order("ordem");
    if (!error && data) setTemas(data);
  };

  const fetchSubtemas = async () => {
    const { data, error } = await supabase
      .from("subtemas")
      .select("id, nome, tema_id, ordem")
      .order("ordem");
    if (!error && data) setSubtemas(data);
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

  const fetchUserEixo = async () => {
    if (!user || isAdminMaster) return;
    const { data, error } = await supabase
      .from("user_eixos")
      .select("eixo_id")
      .eq("user_id", user.id);
    if (!error && data && data.length === 1) {
      setEixoId(data[0].eixo_id);
      setEixoLocked(true);
    }
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
    if (isAdminMaster) return true;

    switch (currentStep) {
      case 0:
        if (isInstitucional) {
          if (!instituicaoNome.trim()) { toast.error("Informe o nome da instituição"); return false; }
          if (!instituicaoSegmento) { toast.error("Selecione o segmento da instituição"); return false; }
          if (!representanteNome.trim()) { toast.error("Informe o nome do representante"); return false; }
        }
        if (!municipioId) { toast.error("Selecione o município"); return false; }
        if (!eixoId) { toast.error("Selecione o eixo temático"); return false; }
        if (!temaId) { toast.error("Selecione o tema"); return false; }
        return true;
      case 1:
        if (!questionario.aquecimento.area_atuacao_especifica.trim()) {
          toast.error("Descreva sua área de atuação específica"); return false;
        }
        if (!questionario.aquecimento.principais_desafios.some(d => d.trim())) {
          toast.error("Informe ao menos um desafio"); return false;
        }
        return true;
      case 2:
        if (!questionario.o_que_funciona.acoes_manter.some(a => a.trim())) {
          toast.error("Informe ao menos uma ação que funciona"); return false;
        }
        return true;
      case 3:
        if (!questionario.o_que_nao_funciona.causas_raiz.trim()) {
          toast.error("Descreva as causas-raiz"); return false;
        }
        return true;
      case 4:
        if (!questionario.parar_substituir.rotinas_ineficientes.trim()) {
          toast.error("Descreva as rotinas ineficientes"); return false;
        }
        return true;
      case 5:
        if (!questionario.governanca.planejamento_vs_anuncio.trim()) {
          toast.error("Responda sobre planejamento vs. anúncio"); return false;
        }
        return true;
      case 6: // Visão Setorial — perguntas abertas
        return true;
      case 7: // Cocriação
        if (!questionario.cocriacao.entregas_90_dias.trim()) {
          toast.error("Descreva as entregas para os primeiros 90 dias"); return false;
        }
        return true;
      case 8: // Título
        if (!titulo.trim()) {
          toast.error("Informe o título da proposta"); return false;
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
      const tituloFinal = titulo.trim();
      const descricao = questionario.o_que_nao_funciona.causas_raiz || questionario.aquecimento.area_atuacao_especifica;
      const metas = questionario.cocriacao.entregas_90_dias;

      const questionarioCompleto = {
        ...questionario,
        identificacao: {
          entrevistado_email: entrevistadoEmail.trim(),
          entrevistado_celular: entrevistadoCelular.trim(),
          subtemas: subtemaIds,
          ...(isInstitucional ? {
            instituicao_nome: instituicaoNome.trim(),
            instituicao_cnpj: instituicaoCnpj.trim(),
            instituicao_segmento: instituicaoSegmento,
            representante_nome: representanteNome.trim(),
            representante_cargo: representanteCargo.trim(),
            representante_telefone: representanteTelefone.trim(),
            representante_email: representanteEmail.trim(),
          } : {}),
        },
      };

      const insertData: any = {
        autor_id: user.id,
        lider_responsavel_id: user.id,
        eixo_id: eixoId,
        tema_id: temaId || null,
        subtema_id: subtemaIds.length === 1 ? subtemaIds[0] : null,
        municipio_id: municipioId,
        entrevistado: isInstitucional ? instituicaoNome.trim() : entrevistado.trim(),
        titulo: tituloFinal,
        descricao,
        metas,
        questionario: JSON.parse(JSON.stringify(questionarioCompleto)),
        status: "rascunho" as const,
        etapa: 1,
        tipo_proposta: isInstitucional ? "institucional" : "tecnica",
      };

      if (isInstitucional) {
        insertData.instituicao_nome = instituicaoNome.trim();
        insertData.instituicao_cnpj = instituicaoCnpj.trim();
        insertData.instituicao_segmento = instituicaoSegmento;
        insertData.representante_nome = representanteNome.trim();
        insertData.representante_cargo = representanteCargo.trim();
        insertData.representante_telefone = representanteTelefone.trim();
        insertData.representante_email = representanteEmail.trim();
      }

      const { error } = await supabase.from("propostas_tecnicas").insert([insertData]);

      if (error) throw error;

      sessionStorage.removeItem(DRAFT_KEY);
      setIsSubmitted(true);
      toast.success("Entrevista registrada com sucesso!");
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Erro ao registrar entrevista. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setCurrentStep(0);
    setEntrevistado("");
    setEntrevistadoEmail("");
    setEntrevistadoCelular("");
    setMunicipioId("");
    if (!eixoLocked) setEixoId("");
    setTemaId("");
    setSubtemaIds([]);
    setTitulo("");
    setQuestionario(initialQuestionario);
    setInstituicaoNome("");
    setInstituicaoCnpj("");
    setInstituicaoSegmento("");
    setRepresentanteNome("");
    setRepresentanteCargo("");
    setRepresentanteTelefone("");
    setRepresentanteEmail("");
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
              {isInstitucional ? "Proposta Institucional Registrada!" : "Entrevista Registrada com Sucesso!"}
            </h2>
            <p className="text-gray-400 mb-8">
              {isInstitucional 
                ? "A proposta da sua instituição foi salva e está disponível para análise. Obrigado pela contribuição ao Plano de Governo do Paraná."
                : "Sua entrevista técnica foi salva e está disponível para análise. A estrutura padronizada permite consolidação entre todos os eixos."}
            </p>
            <Button onClick={resetForm} variant="hero" size="lg">
              Registrar Nova Entrevista
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      // ── ETAPA 0: IDENTIFICAÇÃO ──
      case 0:
        return (
          <div className="space-y-6">
            {/* Institutional PJ Fields */}
            {isInstitucional && (
              <>
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                  <p className="text-sm text-amber-400 font-medium">
                    📋 Cadastro Institucional — Preencha os dados da entidade representativa
                  </p>
                </div>

                <div>
                  <Label htmlFor="instituicaoNome" className="text-white mb-2 block">
                    Razão Social / Nome da Instituição *
                  </Label>
                  <Input
                    id="instituicaoNome"
                    value={instituicaoNome}
                    onChange={(e) => setInstituicaoNome(e.target.value)}
                    placeholder="Ex: Associação Comercial e Industrial de Curitiba"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="instituicaoCnpj" className="text-white mb-2 block">
                      CNPJ
                    </Label>
                    <Input
                      id="instituicaoCnpj"
                      value={instituicaoCnpj}
                      onChange={(e) => setInstituicaoCnpj(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instituicaoSegmento" className="text-white mb-2 block">
                      Segmento da Instituição *
                    </Label>
                    <Select value={instituicaoSegmento} onValueChange={setInstituicaoSegmento}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTOS_INSTITUCIONAIS.map((seg) => (
                          <SelectItem key={seg} value={seg}>
                            {seg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 mt-4">
                  <p className="text-sm text-gray-400 mb-4 font-medium">Dados do Representante</p>
                </div>

                <div>
                  <Label htmlFor="representanteNome" className="text-white mb-2 block">
                    Nome do Representante *
                  </Label>
                  <Input
                    id="representanteNome"
                    value={representanteNome}
                    onChange={(e) => setRepresentanteNome(e.target.value)}
                    placeholder="Nome completo do representante legal"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="representanteCargo" className="text-white mb-2 block">
                      Cargo do Representante
                    </Label>
                    <Input
                      id="representanteCargo"
                      value={representanteCargo}
                      onChange={(e) => setRepresentanteCargo(e.target.value)}
                      placeholder="Ex: Presidente, Diretor"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="representanteTelefone" className="text-white mb-2 block">
                      Telefone Institucional
                    </Label>
                    <Input
                      id="representanteTelefone"
                      type="tel"
                      value={representanteTelefone}
                      onChange={(e) => setRepresentanteTelefone(e.target.value)}
                      placeholder="(41) 3333-3333"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="representanteEmail" className="text-white mb-2 block">
                    E-mail Corporativo
                  </Label>
                  <Input
                    id="representanteEmail"
                    type="email"
                    value={representanteEmail}
                    onChange={(e) => setRepresentanteEmail(e.target.value)}
                    placeholder="contato@instituicao.org.br"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div className="border-t border-gray-800 pt-4 mt-4">
                  <p className="text-sm text-gray-400 mb-4 font-medium">Dados da Proposta</p>
                </div>
              </>
            )}

            {/* Standard fields (for tecnica mode) */}
            {!isInstitucional && (
              <>
                <div>
                  <Label htmlFor="entrevistado" className="text-white mb-2 block">
                    Nome do Entrevistado
                  </Label>
                  <Input
                    id="entrevistado"
                    value={entrevistado}
                    onChange={(e) => setEntrevistado(e.target.value)}
                    placeholder="Nome completo do especialista entrevistado"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entrevistadoEmail" className="text-white mb-2 block">
                      Email do Entrevistado
                    </Label>
                    <Input
                      id="entrevistadoEmail"
                      type="email"
                      value={entrevistadoEmail}
                      onChange={(e) => setEntrevistadoEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="entrevistadoCelular" className="text-white mb-2 block">
                      Celular do Entrevistado
                    </Label>
                    <Input
                      id="entrevistadoCelular"
                      type="tel"
                      value={entrevistadoCelular}
                      onChange={(e) => setEntrevistadoCelular(e.target.value)}
                      placeholder="(41) 99999-9999"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </>
            )}

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
                {eixoLocked && (
                  <span className="text-xs text-primary ml-2">(detectado automaticamente)</span>
                )}
              </Label>
              <Select
                value={eixoId}
                onValueChange={setEixoId}
                disabled={eixoLocked && !isAdminMaster}
              >
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
              <Label htmlFor="tema" className="text-white mb-2 block">
                Tema *
              </Label>
              <Select value={temaId} onValueChange={setTemaId} disabled={!eixoId}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder={eixoId ? "Selecione o tema" : "Selecione um eixo primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {temas
                    .filter(t => t.eixo_id === eixoId)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="font-medium">{t.codigo}</span> - {t.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white mb-2 block">Subtemas</Label>
              {!temaId ? (
                <p className="text-sm text-gray-500">Selecione um tema primeiro</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-gray-900 border border-gray-700 rounded-md max-h-48 overflow-y-auto">
                    {subtemas
                      .filter(s => s.tema_id === temaId)
                      .map((s) => (
                        <div key={s.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subtema-${s.id}`}
                            checked={subtemaIds.includes(s.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSubtemaIds(prev => [...prev, s.id]);
                              } else {
                                setSubtemaIds(prev => prev.filter(id => id !== s.id));
                              }
                            }}
                          />
                          <label htmlFor={`subtema-${s.id}`} className="text-sm text-gray-300 cursor-pointer">
                            {s.nome}
                          </label>
                        </div>
                      ))}
                  </div>
                  {subtemaIds.length > 0 && (
                    <p className="text-xs text-primary mt-1">
                      {subtemaIds.length} subtema{subtemaIds.length > 1 ? "s" : ""} selecionado{subtemaIds.length > 1 ? "s" : ""}
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <Label className="text-white mb-2 block">Líder Responsável</Label>
              <Input
                value={liderNome}
                disabled
                className="bg-gray-800 border-gray-700 text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">Preenchido automaticamente</p>
            </div>
          </div>
        );

      // ── ETAPA 1: AQUECIMENTO ──
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">A1.</span> Qual é sua área de atuação específica dentro do setor? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.a1_area_atuacao}
              </p>
              <Textarea
                value={questionario.aquecimento.area_atuacao_especifica}
                onChange={(e) => updateQuestionario("aquecimento", "area_atuacao_especifica", e.target.value)}
                placeholder="Descreva sua área de atuação específica..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">A2.</span> Quais são os 3 principais desafios da sua área hoje? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.a2_desafios_hint}
              </p>
                <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-primary font-semibold">Desafio {index + 1}:</Label>
                    <Input
                      value={questionario.aquecimento.principais_desafios[index]}
                      onChange={(e) => updateArrayItem("aquecimento", "principais_desafios", index, e.target.value)}
                      placeholder={`Descreva o desafio ${index + 1}`}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // ── ETAPA 2: O QUE FUNCIONA ──
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">B1.</span> Cite até 3 ações, programas ou práticas que funcionam bem na sua área e devem ser mantidas *
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.b1_acoes_hint}
              </p>
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-primary font-semibold w-20">Ação {index + 1}:</span>
                    <Input
                      value={questionario.o_que_funciona.acoes_manter[index]}
                      onChange={(e) => updateArrayItem("o_que_funciona", "acoes_manter", index, e.target.value)}
                      placeholder={`Ação/programa que funciona ${index + 1}`}
                      className="bg-gray-900 border-gray-700 text-white flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">B2.</span> Se essas ações fossem interrompidas, qual seria o impacto concreto?
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.b2_impacto_hint}
              </p>
              <Textarea
                value={questionario.o_que_funciona.impacto_parar}
                onChange={(e) => updateQuestionario("o_que_funciona", "impacto_parar", e.target.value)}
                placeholder="Descreva o impacto da descontinuidade..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
          </div>
        );

      // ── ETAPA 3: O QUE NÃO FUNCIONA ──
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">C1.</span> Quais são as causas-raiz dos principais problemas da sua área? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.c1_causas_hint}
              </p>
              <Textarea
                value={questionario.o_que_nao_funciona.causas_raiz}
                onChange={(e) => updateQuestionario("o_que_nao_funciona", "causas_raiz", e.target.value)}
                placeholder="Descreva as causas-raiz..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">C2.</span> Dê um exemplo real de falha recorrente na sua área
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.c2_caso_hint}
              </p>
              <Textarea
                value={questionario.o_que_nao_funciona.caso_real}
                onChange={(e) => updateQuestionario("o_que_nao_funciona", "caso_real", e.target.value)}
                placeholder="Descreva um caso real..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">C3.</span> Se pudesse corrigir uma única coisa, qual seria a prioridade?
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.c3_prioridade_hint}
              </p>
              <Textarea
                value={questionario.o_que_nao_funciona.prioridade_correcao}
                onChange={(e) => updateQuestionario("o_que_nao_funciona", "prioridade_correcao", e.target.value)}
                placeholder="Prioridade de correção..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
          </div>
        );

      // ── ETAPA 4: PARAR / SUBSTITUIR ──
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">D1.</span> Quais rotinas, programas ou práticas deveriam ser descontinuadas? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.d1_rotinas_hint}
              </p>
              <Textarea
                value={questionario.parar_substituir.rotinas_ineficientes}
                onChange={(e) => updateQuestionario("parar_substituir", "rotinas_ineficientes", e.target.value)}
                placeholder="Rotinas e práticas ineficientes..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">D2.</span> O que deveria substituí-las?
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.d2_substituicao_hint}
              </p>
              <Textarea
                value={questionario.parar_substituir.substituicao_proposta}
                onChange={(e) => updateQuestionario("parar_substituir", "substituicao_proposta", e.target.value)}
                placeholder="Propostas de substituição..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>
          </div>
        );

      // ── ETAPA 5: GOVERNANÇA ──
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">E1.</span> Na sua percepção, o Estado planeja ou anuncia? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.e1_planejamento_hint}
              </p>
              <Textarea
                value={questionario.governanca.planejamento_vs_anuncio}
                onChange={(e) => updateQuestionario("governanca", "planejamento_vs_anuncio", e.target.value)}
                placeholder="Sua percepção sobre planejamento vs. anúncio..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">E2.</span> Como avalia a integração Estado-Municípios na sua área?
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.e2_integracao_hint}
              </p>
              <Textarea
                value={questionario.governanca.integracao_estado_municipio}
                onChange={(e) => updateQuestionario("governanca", "integracao_estado_municipio", e.target.value)}
                placeholder="Avaliação da integração Estado-Municípios..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>
          </div>
        );

      // ── ETAPA 6: VISÃO SETORIAL (BLOCO F) ──
      case 6: {
        const blocoFConfig = getBlocoFConfig(eixoId);
        return (
          <div className="space-y-6">
            {!eixoId && (
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-gray-400 text-sm">
                Selecione um eixo temático na etapa de Identificação para ver as perguntas específicas.
              </div>
            )}
            {eixoId && (
              <>
                <p className="text-sm text-gray-400 mb-2">
                  Perguntas técnicas para o eixo <span className="text-primary font-semibold">{blocoFConfig.eixoNome}</span>
                </p>
                {blocoFConfig.perguntas.map((pergunta, index) => {
                  const qKey = `q${index + 1}` as keyof typeof questionario.bloco_f;
                  return (
                    <div key={qKey}>
                      <Label className="text-white mb-2 block">
                        <span className="text-primary font-semibold">F{index + 1}.</span> {pergunta}
                      </Label>
                      {index === 5 && (
                        <p className="text-xs text-gray-400 mb-2">Pergunta aberta — fale livremente.</p>
                      )}
                      <Textarea
                        value={questionario.bloco_f[qKey]}
                        onChange={(e) => updateQuestionario("bloco_f", qKey, e.target.value)}
                        placeholder="Sua resposta..."
                        className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      }

      // ── ETAPA 7: COCRIAÇÃO + ENCERRAMENTO ──
      case 7: {
        const programaTeste = getProgramaTeste(eixoId);
        const outrosEixos = eixos.filter(e => e.id !== eixoId);
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">G1.</span> O que deveria ser entregue nos primeiros 90 dias de governo na sua área? *
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {exemplos.g1_entregas_hint}
              </p>
              <Textarea
                value={questionario.cocriacao.entregas_90_dias}
                onChange={(e) => updateQuestionario("cocriacao", "entregas_90_dias", e.target.value)}
                placeholder="Entregas prioritárias para os primeiros 90 dias..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">G2.</span> Programa-Teste: <span className="text-primary">"{programaTeste.nome}"</span>
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {programaTeste.descricao}. — Se esse programa fosse implementado como piloto, o que você ajustaria, expandiria ou criticaria?
              </p>
              <Textarea
                value={questionario.cocriacao.programa_teste}
                onChange={(e) => updateQuestionario("cocriacao", "programa_teste", e.target.value)}
                placeholder="Sua avaliação e sugestões sobre o programa-teste..."
                className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">
                <span className="text-primary font-semibold">G3.</span> Sugestão Cross-Eixo
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                Há algo que você sugeriria para outros eixos temáticos? Selecione os eixos e descreva sua sugestão.
              </p>

              {outrosEixos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-gray-900 border border-gray-700 rounded-md mb-3">
                  {outrosEixos.map((e) => (
                    <div key={e.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cross-${e.id}`}
                        checked={questionario.cocriacao.cross_eixo_ids.includes(e.id)}
                        onCheckedChange={() => toggleCheckbox("cocriacao", "cross_eixo_ids", e.id)}
                      />
                      <label htmlFor={`cross-${e.id}`} className="text-sm text-gray-300 cursor-pointer">
                        {e.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                value={questionario.cocriacao.sugestao_cross_eixo}
                onChange={(e) => updateQuestionario("cocriacao", "sugestao_cross_eixo", e.target.value)}
                placeholder="Sua sugestão para os outros eixos..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
          </div>
        );
      }

      // ── ETAPA 8: TÍTULO DA PROPOSTA ──
      case 8:
        return (
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <p className="text-sm text-primary font-medium mb-1">💡 Por que o título é o último campo?</p>
              <p className="text-sm text-gray-300">
                Após responder todo o questionário, você tem uma visão mais clara e objetiva do conteúdo da proposta. 
                Crie um título que sintetize as principais ideias e propostas registradas ao longo da entrevista.
              </p>
            </div>

            <div>
              <Label htmlFor="titulo" className="text-white mb-2 block">
                Título da Proposta *
              </Label>
              <p className="text-xs text-gray-400 mb-3">
                O título deve refletir o conteúdo das propostas e sugestões descritas no questionário. 
                Seja claro, objetivo e descritivo — ele será usado para identificar esta proposta no painel de gestão.
              </p>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Reestruturação da rede de atenção primária nos municípios do interior"
                className="bg-gray-900 border-gray-700 text-white"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 text-right mt-1">
                {titulo.length}/200
              </p>
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
                  Entrevista Técnica — Plano de Governo
                </h2>
              </div>
              <p className="text-gray-400">
                8 blocos · ~25 perguntas · ~37 minutos · Estrutura padronizada para todos os eixos
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
                      onClick={() => {
                        if (isAdminMaster) {
                          setCurrentStep(index);
                        } else if (index < currentStep) {
                          setCurrentStep(index);
                        }
                      }}
                      disabled={!isAdminMaster && index > currentStep}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${isActive
                          ? "bg-primary text-black"
                          : isCompleted
                            ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                            : isAdminMaster
                              ? "bg-gray-700 text-gray-300 cursor-pointer hover:bg-gray-600"
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
                  Bloco {currentStep + 1} de {steps.length}
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
                    {isSubmitting ? "Enviando..." : "Registrar Entrevista"}
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
                  Sobre esta Entrevista
                </h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>8 blocos: do aquecimento à cocriação</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>~25 perguntas em ~37 minutos</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Bloco F com 6 perguntas técnicas por eixo</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Programa-Teste parametrizado por setor</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Sugestão Cross-Eixo para visão sistêmica</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Dicas para o Entrevistador
                </h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>Use o Aquecimento para calibrar o nível técnico</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>Blocos B-D: provoque respostas com exemplos</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>Bloco F: perguntas profundas — dê tempo para reflexão</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>Bloco G: encerre com tom propositivo e futuro</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EntrevistaForm;
