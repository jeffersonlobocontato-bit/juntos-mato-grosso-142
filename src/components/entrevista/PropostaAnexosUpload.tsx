import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AnexoTema { id: string; nome: string; eixo_id: string }
export interface AnexoSubtema { id: string; nome: string; tema_id: string }

export interface PendingAnexo {
  file: File;
  title: string;
  tema_id?: string | null;
  subtema_id?: string | null;
  tema_nome?: string | null;
  subtema_nome?: string | null;
}

interface PropostaAnexosUploadProps {
  propostaId?: string;
  eixoId?: string;
  eixoNome?: string;
  temas?: AnexoTema[];
  subtemas?: AnexoSubtema[];
  /**
   * "live" (default): faz upload imediato ao Supabase usando propostaId/eixoId.
   * "staging": mantém arquivos em memória; chama onFilesChange para o pai persistir depois.
   */
  mode?: "live" | "staging";
  onFilesChange?: (items: PendingAnexo[]) => void;
}

interface AnexoItem {
  url: string;
  name: string;
  path: string;
  size: number;
  uploaded_at: string;
  title?: string;
  tema_id?: string | null;
  subtema_id?: string | null;
  tema_nome?: string | null;
  subtema_nome?: string | null;
}

export const MAX_SIZE_MB = 20;
export const ALLOWED_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "png", "jpg", "jpeg"];

export const PropostaAnexosUpload = ({ propostaId, eixoId, eixoNome, temas = [], subtemas = [], mode = "live", onFilesChange }: PropostaAnexosUploadProps) => {
  const [anexos, setAnexos] = useState<AnexoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Form state for single-file flow
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [temaInput, setTemaInput] = useState<string>("");
  const [subtemaInput, setSubtemaInput] = useState<string>("");

  // Staging-mode local queue
  const [pending, setPending] = useState<PendingAnexo[]>([]);

  const temasFiltrados = eixoId ? temas.filter((t) => t.eixo_id === eixoId) : temas;
  const subtemasFiltrados = temaInput ? subtemas.filter((s) => s.tema_id === temaInput) : [];

  // Carrega anexos atuais (apenas live)
  useEffect(() => {
    if (mode !== "live" || !propostaId) return;
    const fetchAnexos = async () => {
      const { data } = await supabase
        .from("propostas_tecnicas")
        .select("anexos")
        .eq("id", propostaId)
        .single();
      if (data?.anexos && Array.isArray(data.anexos)) {
        try {
          const parsed = (data.anexos as string[]).map((s) => JSON.parse(s) as AnexoItem);
          setAnexos(parsed);
        } catch {
          setAnexos([]);
        }
      }
    };
    fetchAnexos();
  }, [propostaId, mode]);

  const persist = async (next: AnexoItem[]) => {
    const serialized = next.map((a) => JSON.stringify(a));
    const { error } = await supabase
      .from("propostas_tecnicas")
      .update({ anexos: serialized })
      .eq("id", propostaId);
    if (error) throw error;
  };

  const validateFile = (file: File): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`Formato não permitido: ${file.name}`);
      return false;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_SIZE_MB}MB: ${file.name}`);
      return false;
    }
    return true;
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!validateFile(file)) return;
    setSelectedFile(file);
    if (!titleInput.trim()) setTitleInput(file.name.replace(/\.[^.]+$/, ""));
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitleInput("");
    setTemaInput("");
    setSubtemaInput("");
  };

  const handleAdd = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo");
      return;
    }
    if (!titleInput.trim()) {
      toast.error("Informe o título do anexo");
      return;
    }

    const tema = temas.find((t) => t.id === temaInput);
    const subtema = subtemas.find((s) => s.id === subtemaInput);

    if (mode === "staging") {
      const item: PendingAnexo = {
        file: selectedFile,
        title: titleInput.trim(),
        tema_id: tema?.id ?? null,
        subtema_id: subtema?.id ?? null,
        tema_nome: tema?.nome ?? null,
        subtema_nome: subtema?.nome ?? null,
      };
      const next = [...pending, item];
      setPending(next);
      onFilesChange?.(next);
      resetForm();
      toast.success("Anexo adicionado. Será enviado após registrar a entrevista.");
      return;
    }

    // Live mode — upload immediate
    setIsUploading(true);
    try {
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${eixoId}/${propostaId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("proposta-anexos")
        .upload(path, selectedFile, { contentType: selectedFile.type, upsert: false });
      if (upErr) {
        toast.error(`Erro ao enviar ${selectedFile.name}: ${upErr.message}`);
        return;
      }
      const { data: pub } = supabase.storage.from("proposta-anexos").getPublicUrl(path);
      const newItem: AnexoItem = {
        url: pub.publicUrl,
        name: titleInput.trim(),
        path,
        size: selectedFile.size,
        uploaded_at: new Date().toISOString(),
        title: titleInput.trim(),
        tema_id: tema?.id ?? null,
        subtema_id: subtema?.id ?? null,
        tema_nome: tema?.nome ?? null,
        subtema_nome: subtema?.nome ?? null,
      };
      const next = [...anexos, newItem];
      await persist(next);
      setAnexos(next);
      resetForm();
      toast.success("Anexo enviado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar anexo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async (item: AnexoItem) => {
    try {
      await supabase.storage.from("proposta-anexos").remove([item.path]);
      const next = anexos.filter((a) => a.path !== item.path);
      await persist(next);
      setAnexos(next);
      toast.success("Arquivo removido");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover arquivo");
    }
  };

  const handleRemovePending = (idx: number) => {
    const next = pending.filter((_, i) => i !== idx);
    setPending(next);
    onFilesChange?.(next);
  };

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-6 text-left">
      <div className="flex items-center gap-2 mb-1">
        <Upload className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-white">Anexar documentos da proposta</h3>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Envie arquivos relacionados a esta proposta
        {eixoNome ? <> — eixo <span className="text-primary font-medium">{eixoNome}</span></> : null}.
        Formatos: PDF, DOC, XLS, PPT, TXT, CSV, imagens. Máx. {MAX_SIZE_MB}MB por arquivo.
        Adicione um arquivo por vez, com título e — quando aplicável — tema e subtema.
      </p>
      {mode === "staging" && (
        <p className="text-xs text-amber-400 mb-3">
          ⚠️ Os arquivos só serão enviados após você clicar em "Registrar Entrevista". Eles não ficam salvos no rascunho.
        </p>
      )}

      <div className="space-y-3 border border-gray-700 rounded-lg p-4 bg-gray-900/40">
        <div>
          <Label className="text-white text-sm mb-1 block">1. Selecionar arquivo</Label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="anexo-upload-single"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
              onChange={handlePickFile}
              disabled={isUploading}
            />
            <label htmlFor="anexo-upload-single" className="cursor-pointer block">
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-primary">
                  <FileText className="w-4 h-4" />
                  <span className="truncate">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm">Clique para selecionar 1 arquivo</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div>
          <Label className="text-white text-sm mb-1 block">2. Título do anexo *</Label>
          <Input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Ex: Estudo técnico de viabilidade — versão final"
            className="bg-gray-800 border-gray-700 text-white"
            maxLength={200}
          />
        </div>

        {temasFiltrados.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-white text-sm mb-1 block">Tema (opcional)</Label>
              <Select
                value={temaInput || "__none__"}
                onValueChange={(v) => {
                  const next = v === "__none__" ? "" : v;
                  setTemaInput(next);
                  setSubtemaInput("");
                }}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione um tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {temasFiltrados.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white text-sm mb-1 block">Subtema (opcional)</Label>
              <Select
                value={subtemaInput || "__none__"}
                onValueChange={(v) => setSubtemaInput(v === "__none__" ? "" : v)}
                disabled={!temaInput || subtemasFiltrados.length === 0}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder={!temaInput ? "Selecione um tema antes" : "Selecione um subtema"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {subtemasFiltrados.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {(selectedFile || titleInput || temaInput) && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={isUploading}>
              Limpar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={isUploading || !selectedFile || !titleInput.trim()}
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando...</>
            ) : mode === "staging" ? (
              <><Upload className="w-4 h-4 mr-1" /> Adicionar anexo</>
            ) : (
              <><Upload className="w-4 h-4 mr-1" /> Enviar anexo</>
            )}
          </Button>
        </div>
      </div>

        {anexos.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {anexos.length} arquivo(s) anexado(s)
            </p>
            {anexos.map((item) => (
              <div
                key={item.path}
                className="flex items-start justify-between gap-2 p-2 bg-gray-800/60 rounded border border-gray-700"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 text-sm text-gray-200 hover:text-primary"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate font-medium">{item.title || item.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      ({(item.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  {(item.tema_nome || item.subtema_nome) && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6 truncate">
                      {item.tema_nome}{item.subtema_nome ? ` › ${item.subtema_nome}` : ""}
                    </p>
                  )}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(item)}
                  className="text-gray-400 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {mode === "staging" && pending.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {pending.length} arquivo(s) prontos para envio
            </p>
            {pending.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="flex items-start justify-between gap-2 p-2 bg-gray-800/60 rounded border border-gray-700"
              >
                <div className="flex-1 min-w-0 text-sm text-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      ({(item.file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 ml-6 truncate">
                    {item.file.name}
                    {(item.tema_nome || item.subtema_nome) && (
                      <> · {item.tema_nome}{item.subtema_nome ? ` › ${item.subtema_nome}` : ""}</>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePending(idx)}
                  className="text-gray-400 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default PropostaAnexosUpload;