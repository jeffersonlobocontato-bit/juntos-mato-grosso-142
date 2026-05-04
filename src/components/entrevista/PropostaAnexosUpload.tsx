import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, Trash2, CheckCircle2 } from "lucide-react";

interface PropostaAnexosUploadProps {
  propostaId?: string;
  eixoId?: string;
  eixoNome?: string;
  /**
   * "live" (default): faz upload imediato ao Supabase usando propostaId/eixoId.
   * "staging": mantém arquivos em memória; chama onFilesChange para o pai persistir depois.
   */
  mode?: "live" | "staging";
  onFilesChange?: (items: { file: File; description: string }[]) => void;
}

interface AnexoItem {
  url: string;
  name: string;
  path: string;
  size: number;
  uploaded_at: string;
}

export const MAX_SIZE_MB = 20;
export const ALLOWED_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "png", "jpg", "jpeg"];

export const PropostaAnexosUpload = ({ propostaId, eixoId, eixoNome, mode = "live", onFilesChange }: PropostaAnexosUploadProps) => {
  const [anexos, setAnexos] = useState<AnexoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");
  // Staging-mode local queue
  const [pending, setPending] = useState<{ file: File; description: string }[]>([]);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validação comum
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        if (!ALLOWED_EXT.includes(ext)) {
          toast.error(`Formato não permitido: ${file.name}`);
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          toast.error(`Arquivo maior que ${MAX_SIZE_MB}MB: ${file.name}`);
          continue;
        }
      accepted.push(file);
    }

    // Staging mode: só guarda em memória
    if (mode === "staging") {
      const desc = description.trim();
      const items = accepted.map((file) => ({ file, description: desc }));
      const next = [...pending, ...items];
      setPending(next);
      onFilesChange?.(next);
      setDescription("");
      e.target.value = "";
      if (items.length > 0) {
        toast.success(`${items.length} arquivo(s) adicionado(s). Serão enviados após registrar a entrevista.`);
      }
      return;
    }

    setIsUploading(true);
    const newItems: AnexoItem[] = [];

    try {
      for (const file of accepted) {

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${eixoId}/${propostaId}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("proposta-anexos")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upErr) {
          toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`);
          continue;
        }

        const { data: pub } = supabase.storage.from("proposta-anexos").getPublicUrl(path);

        newItems.push({
          url: pub.publicUrl,
          name: description.trim() ? `${description.trim()} — ${file.name}` : file.name,
          path,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        });
      }

      if (newItems.length > 0) {
        const next = [...anexos, ...newItems];
        await persist(next);
        setAnexos(next);
        setDescription("");
        toast.success(`${newItems.length} arquivo(s) enviado(s) com sucesso!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar anexos");
    } finally {
      setIsUploading(false);
      e.target.value = "";
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
      </p>
      {mode === "staging" && (
        <p className="text-xs text-amber-400 mb-3">
          ⚠️ Os arquivos só serão enviados após você clicar em "Registrar Entrevista". Eles não ficam salvos no rascunho.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <Label className="text-white text-sm mb-1 block">Descrição (opcional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Estudo técnico, anexo de comprovação..."
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            id="anexo-upload"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <label htmlFor="anexo-upload" className="cursor-pointer block">
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enviando...</span>
              </div>
            ) : (
              <div className="text-gray-400">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Clique para selecionar arquivos</p>
                <p className="text-xs mt-1">ou arraste e solte (múltiplos arquivos permitidos)</p>
              </div>
            )}
          </label>
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
                className="flex items-center justify-between gap-2 p-2 bg-gray-800/60 rounded border border-gray-700"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-200 hover:text-primary truncate flex-1"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(item.size / 1024).toFixed(0)} KB)
                  </span>
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
                className="flex items-center justify-between gap-2 p-2 bg-gray-800/60 rounded border border-gray-700"
              >
                <div className="flex items-center gap-2 text-sm text-gray-200 truncate flex-1">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {item.description ? `${item.description} — ${item.file.name}` : item.file.name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(item.file.size / 1024).toFixed(0)} KB)
                  </span>
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
    </div>
  );
};

export default PropostaAnexosUpload;