import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import videoAsset from "@/assets/metodologia-campanha.mp4.asset.json";

type Props = { navy: string; green700: string; green900: string; manageMode?: boolean };

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const MetodologiaVideo = ({ navy, green700, green900, manageMode = false }: Props) => {
  const { isAdmin, isAdminMaster, user } = useAuth();
  const canManage = manageMode && !!user && (isAdmin || isAdminMaster);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [poster, setPoster] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("site_video_config")
      .select("poster_path")
      .eq("chave", "metodologia")
      .maybeSingle();
    const path = (data as any)?.poster_path as string | null;
    if (!path) return setPoster(null);
    const { data: signed } = await supabase.storage
      .from("site-video")
      .createSignedUrl(path, 60 * 60 * 6);
    setPoster(signed?.signedUrl ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePoster = async (blob: Blob, ext: string) => {
    setSaving(true);
    setMsg(null);
    try {
      const path = `metodologia/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("site-video")
        .upload(path, blob, { contentType: blob.type || `image/${ext}` });
      if (up.error) throw up.error;
      const res = await supabase
        .from("site_video_config")
        .upsert({ chave: "metodologia", poster_path: path, video_url: videoAsset.url, updated_by: user?.id ?? null, updated_at: new Date().toISOString() } as any);
      if (res.error) throw res.error;
      setMsg("Capa atualizada com sucesso.");
      setEditing(false);
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Erro ao salvar a capa.");
    } finally {
      setSaving(false);
    }
  };

  const captureFrame = async () => {
    const v = scrubRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return setMsg("Não foi possível capturar o quadro.");
      void savePoster(blob, "jpg");
    }, "image/jpeg", 0.9);
  };

  const onUpload = (f: File | null) => {
    if (!f) return;
    void savePoster(f, (f.name.split(".").pop() || "jpg").toLowerCase());
  };

  return (
    <section className="py-14 md:py-20 container mx-auto px-6 max-w-5xl">
      <div className="text-center mb-8">
        <span className="text-xs font-bold tracking-wide uppercase" style={{ color: green700 }}>
          Veja como funcionou
        </span>
        <h2 className="font-black text-2xl md:text-3xl mt-2" style={{ color: navy }}>
          A campanha que convidou o Paraná
        </h2>
      </div>

      <video
        ref={videoRef}
        src={videoAsset.url}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="w-full aspect-video rounded-2xl bg-black shadow-lg"
      />

      {canManage && (
        <div className="mt-4">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full"
              style={{ background: `${green900}14`, color: green900, border: `1px solid ${green900}33` }}
            >
              Definir capa do vídeo
            </button>
          ) : (
            <div className="rounded-2xl p-5 bg-white shadow-sm" style={{ border: `1px solid ${navy}22` }}>
              <p className="font-black mb-3" style={{ color: navy }}>Escolher capa (thumbnail)</p>

              <video
                ref={scrubRef}
                src={videoAsset.url}
                crossOrigin="anonymous"
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                className="w-full aspect-video rounded-xl bg-black mb-3"
              />

              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.05}
                value={time}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setTime(t);
                  if (scrubRef.current) scrubRef.current.currentTime = t;
                }}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mb-4">
                Arraste a linha do tempo até o quadro desejado — {fmt(time)} / {fmt(duration)}
              </p>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={captureFrame}
                  disabled={saving}
                  className="text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full text-white disabled:opacity-50"
                  style={{ background: green900 }}
                >
                  {saving ? "Salvando..." : "Usar este quadro"}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={saving}
                  className="text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full disabled:opacity-50"
                  style={{ border: `1px solid ${navy}33`, color: navy }}
                >
                  Enviar imagem
                </button>
                <button
                  onClick={() => { setEditing(false); setMsg(null); }}
                  className="text-xs text-gray-500 underline"
                >
                  Cancelar
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
                />
              </div>
              {msg && <p className="text-xs mt-3" style={{ color: navy }}>{msg}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default MetodologiaVideo;
