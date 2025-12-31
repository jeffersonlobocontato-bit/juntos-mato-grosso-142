import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  name: string;
  city: string;
  whatsapp: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const defaultResponses: Record<string, string> = {
  "o que é a rota 399": "A Rota 399 é uma iniciativa popular que percorre todos os 399 municípios do Paraná para coletar propostas técnicas e sugestões da população, construindo colaborativamente um Plano de Governo para o Estado.",
  "como participar": "Você pode participar de duas formas: 1) Enviando sua sugestão através do formulário na página principal, ou 2) Participando das audiências públicas que acontecem em cada município.",
  "quem pode enviar sugestões": "Qualquer cidadão paranaense pode enviar sugestões! Não é necessário ser especialista. Valorizamos todas as vozes e perspectivas.",
  "o que acontece com minha sugestão": "Sua sugestão é registrada e analisada por nossa equipe técnica. As sugestões são agrupadas por eixo temático e município, e as mais relevantes são incorporadas ao Plano de Governo.",
  "quais são os eixos temáticos": "Os principais eixos são: Educação, Saúde, Segurança, Infraestrutura, Meio Ambiente, Agricultura, Desenvolvimento Econômico, Cultura e Turismo, Assistência Social, entre outros.",
  "quando será lançado o plano": "O Plano de Governo está sendo construído ao longo de 2024, com previsão de consolidação final após as 4 etapas do processo participativo em todos os municípios.",
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<UserData>({ name: "", city: "", whatsapp: "" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleStartChat = () => {
    if (!formData.name.trim() || !formData.city.trim() || !formData.whatsapp.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos para iniciar a conversa.",
        variant: "destructive",
      });
      return;
    }

    if (formData.whatsapp.replace(/\D/g, "").length < 10) {
      toast({
        title: "WhatsApp inválido",
        description: "Por favor, informe um número de WhatsApp válido.",
        variant: "destructive",
      });
      return;
    }

    setUserData(formData);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Olá, ${formData.name}! 👋 Sou o assistente da Rota 399. Estou aqui para tirar suas dúvidas sobre nossa iniciativa popular de construção do Plano de Governo do Paraná.\n\nPergunte-me sobre:\n• O que é a Rota 399\n• Como participar\n• Eixos temáticos\n• O que acontece com sua sugestão\n\nComo posso ajudar?`,
      },
    ]);
  };

  const findBestResponse = (question: string): string => {
    const normalizedQuestion = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const [key, response] of Object.entries(defaultResponses)) {
      const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedQuestion.includes(normalizedKey) || normalizedKey.split(" ").some(word => word.length > 3 && normalizedQuestion.includes(word))) {
        return response;
      }
    }

    // Check for keywords
    if (normalizedQuestion.includes("participar") || normalizedQuestion.includes("contribuir")) {
      return defaultResponses["como participar"];
    }
    if (normalizedQuestion.includes("eixo") || normalizedQuestion.includes("tema")) {
      return defaultResponses["quais são os eixos temáticos"];
    }
    if (normalizedQuestion.includes("sugestao") || normalizedQuestion.includes("ideia")) {
      return defaultResponses["o que acontece com minha sugestão"];
    }
    if (normalizedQuestion.includes("quem") || normalizedQuestion.includes("pode")) {
      return defaultResponses["quem pode enviar sugestões"];
    }
    if (normalizedQuestion.includes("quando") || normalizedQuestion.includes("prazo") || normalizedQuestion.includes("plano")) {
      return defaultResponses["quando será lançado o plano"];
    }
    if (normalizedQuestion.includes("rota") || normalizedQuestion.includes("399") || normalizedQuestion.includes("o que")) {
      return defaultResponses["o que é a rota 399"];
    }

    return "Desculpe, não tenho uma resposta específica para essa pergunta. Você pode reformular ou perguntar sobre: o que é a Rota 399, como participar, eixos temáticos, ou o processo de sugestões. Se preferir, envie sua sugestão pelo formulário na página principal!";
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate response delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const response = findBestResponse(userMessage.content);
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center ${isOpen ? "hidden" : ""}`}
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[550px] max-h-[calc(100vh-6rem)] bg-card rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Assistente Rota 399</h3>
                  <p className="text-xs text-primary-foreground/70">Tire suas dúvidas</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {!userData ? (
              /* Registration Form */
              <div className="flex-1 p-6 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="font-display font-bold text-lg text-foreground mb-2">
                    Vamos nos conhecer?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Preencha seus dados para iniciar a conversa
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Seu nome *
                    </label>
                    <Input
                      placeholder="Digite seu nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-muted/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Sua cidade *
                    </label>
                    <Input
                      placeholder="Ex: Curitiba"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="bg-muted/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      WhatsApp *
                    </label>
                    <Input
                      placeholder="(41) 99999-9999"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                      className="bg-muted/50"
                      maxLength={16}
                    />
                  </div>
                  <Button onClick={handleStartChat} className="w-full" size="lg">
                    Iniciar Conversa
                  </Button>
                </div>
              </div>
            ) : (
              /* Chat Area */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Digitando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua pergunta..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="flex-1 bg-muted/50"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
