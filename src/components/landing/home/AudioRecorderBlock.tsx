import { useEffect, useRef, useState } from "react";
import { Mic, FileText, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onTranscript: (text: string) => void;
}

// === WAV encoding helpers (16 kHz mono, 16-bit PCM) ===
function downsampleBuffer(buffer: Float32Array, inSampleRate: number, outSampleRate: number) {
  if (outSampleRate >= inSampleRate) return buffer;
  const ratio = inSampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffset = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffset && i < buffer.length; i++) {
      accum += buffer[i]; count++;
    }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffset;
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

const AudioRecorderBlock = ({ onTranscript }: Props) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close().catch(() => {});
  }, []);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(ctx.destination);
      setIsRecording(true);
      setElapsed(0);
      setTranscript("");
      timerRef.current = window.setInterval(() => setElapsed(x => x + 1), 1000);
    } catch {
      toast({ title: "Microfone indisponível", description: "Permita o acesso ao microfone para gravar.", variant: "destructive" });
    }
  };

  const stopRec = async () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    streamRef.current?.getTracks().forEach(t => t.stop());
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    const ctx = ctxRef.current;
    if (!ctx) return;
    // concat
    const total = chunksRef.current.reduce((a, b) => a + b.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const c of chunksRef.current) { merged.set(c, off); off += c.length; }
    const down = downsampleBuffer(merged, ctx.sampleRate, 16000);
    await ctx.close().catch(() => {});
    const blob = encodeWav(down, 16000);
    if (blob.size < 2048) {
      toast({ title: "Gravação muito curta", description: "Tente novamente falando por alguns segundos.", variant: "destructive" });
      return;
    }
    await transcribe(blob);
  };

  const transcribe = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscript("");
    try {
      const fd = new FormData();
      fd.append("file", blob, "recording.wav");
      const supaUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(`${supaUrl}/functions/v1/transcribe-audio`, {
        method: "POST",
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        body: fd,
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "transcript.text.delta" && typeof evt.delta === "string") {
              acc += evt.delta;
              setTranscript(acc);
            } else if (evt.type === "transcript.text.done" && typeof evt.text === "string") {
              acc = evt.text;
              setTranscript(acc);
            }
          } catch { /* ignore parse errors */ }
        }
      }
      if (acc.trim()) onTranscript(acc.trim());
      else toast({ title: "Não captamos áudio", description: "Não foi possível transcrever. Tente gravar novamente.", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Erro na transcrição", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Mic className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display font-bold text-foreground">Enviar opinião por áudio</p>
          <p className="text-sm text-muted-foreground">Fale e envie sua opinião de forma prática.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          aria-pressed={isRecording}
          onClick={isRecording ? stopRec : startRec}
          disabled={isTranscribing}
          className={`h-12 rounded-full inline-flex items-center justify-center gap-2 font-semibold text-sm transition ${
            isRecording
              ? "bg-destructive text-destructive-foreground"
              : "bg-gradient-gold text-primary-deep shadow-md hover:brightness-105"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
          style={!isRecording ? { color: "hsl(150 75% 16%)" } : undefined}
        >
          {isTranscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {isTranscribing
            ? "Transcrevendo..."
            : isRecording
              ? `Parar e transcrever (${mmss})`
              : "Gravar áudio"}
        </button>
      </div>

      <div className="rounded-xl bg-muted/60 border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Transcrição</span>
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[2.5rem]">
          {transcript || "Seu áudio será convertido em texto e enviado junto com sua sugestão."}
        </p>
      </div>
    </div>
  );
};

export default AudioRecorderBlock;