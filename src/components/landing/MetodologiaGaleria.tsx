import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Foto = {
  id: string;
  legenda: string | null;
  image_path: string;
  ordem: number;
  ativo: boolean;
};

type Brand = { navy: string; green500: string; green700: string };

const MetodologiaGaleria = ({ brand }: { brand: Brand }) => {
  const { user, isAdmin, isAdminMaster } = useAuth();
  const canManage = !!user && (isAdmin || isAdminMaster);

  const [items, setItems] = useState<Foto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [legenda, setLegenda] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("metodologia_galeria")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    const list = (data || []) as Foto[];
    setItems(list);
    if (list.length) {
      const { data: signed } = await supabase.storage
        .from("metodologia-galeria")
        .createSignedUrls(list.map((i) => i.image_path), 60 * 60 * 6);
      const map: Record<string, string> = {};
      (signed || []).forEach((s) => {
        if (s.signedUrl && s.path) map[s.path] = s.signedUrl;
      });
      setUrls(map);
    } else {
      setUrls({});
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return setMsg("Selecione uma ou mais fotos.");
    setSaving(true);
    setMsg(null);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage
          .from("metodologia-galeria")
          .upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const ins = await supabase.from("metodologia_galeria").insert({
          legenda: legenda.trim() || null,
          image_path: path,
          created_by: user?.id ?? null,
        });
        if (ins.error) throw ins.error;
      }
      setLegenda("");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      setMsg("Fotos publicadas.");
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao enviar as fotos.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Foto) => {
    if (!confirm("Remover esta foto da galeria?")) return;
    await supabase.from("metodologia_galeria").delete().eq("id", item.id);
    await supabase.storage.from("metodologia-galeria").remove([item.image_path]);
    await load();
  };

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm bg-white";
  const placeholders = Array.from({ length: 8 }, (_, i) => i);

  return (
    <section className="py-14 md:py-20" style={{ background: "#f7f8f5" }}>
      <div className="container mx-auto px-6 max-w-6xl mb-8">
        <span className="text-xs font-bold tracking-wide uppercase" style={{ color: brand.green700 }}>
          Registro do processo
        </span>
        <h2 className="font-black text-2xl md:text-3xl mt-2" style={{ color: brand.navy }}>
          Reuniões, entregas e participação em cada região do Paraná
        </h2>
      </div>

      {canManage && (
        <div className="container mx-auto px-6 max-w-3xl mb-8">
          <button
            type="button"
            onClick={() => { setOpen((v) => !v); setMsg(null); }}
            className="mx-auto block rounded-full px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: brand.green700 }}
          >
            {open ? "Fechar edição" : "+ Adicionar fotos da galeria"}
          </button>

          {open && (
            <form
              onSubmit={submit}
              className="mt-5 grid gap-3 rounded-2xl border bg-white p-5"
              style={{ borderColor: `${brand.green500}33` }}
            >
              <input
                className={inputCls}
                placeholder="Legenda (opcional) — ex.: Entrega de propostas em Cascavel"
                value={legenda}
                onChange={(e) => setLegenda(e.target.value)}
              />
              <input
                ref={fileRef}
                className={inputCls}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                style={{ background: brand.green500 }}
              >
                {saving ? "Enviando..." : "Publicar fotos"}
              </button>
              {msg && <p className="text-xs text-gray-600 m-0">{msg}</p>}
            </form>
          )}
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 px-6 container mx-auto max-w-6xl" style={{ width: "max-content" }}>
          {items.length > 0
            ? items.map((item) => (
                <figure
                  key={item.id}
                  className="w-64 shrink-0 rounded-2xl overflow-hidden bg-white border m-0"
                  style={{ borderColor: `${brand.green500}33` }}
                >
                  {urls[item.image_path] && (
                    <img
                      src={urls[item.image_path]}
                      alt={item.legenda || "Registro do processo de escuta no Paraná"}
                      loading="lazy"
                      onClick={() => setLightbox(urls[item.image_path])}
                      className="w-full h-72 object-cover cursor-zoom-in"
                      style={{ objectPosition: "center 65%" }}
                    />
                  )}
                  {(item.legenda || canManage) && (
                    <figcaption className="p-3 flex items-start justify-between gap-2">
                      <span className="text-xs" style={{ color: brand.navy }}>{item.legenda}</span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          className="text-[11px] font-bold text-red-600 shrink-0"
                        >
                          Remover
                        </button>
                      )}
                    </figcaption>
                  )}
                </figure>
              ))
            : placeholders.map((i) => (
                <div
                  key={i}
                  className="w-64 h-80 shrink-0 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed"
                  style={{ borderColor: `${brand.green500}66`, background: `${brand.green500}0a` }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black"
                    style={{ background: `${brand.green500}22`, color: brand.green700 }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-sm text-center px-4" style={{ color: brand.navy }}>
                    Foto de reunião / entrega de documento
                  </p>
                  <p className="text-[11px] text-gray-400 px-4 text-center">substituir por imagem real</p>
                </div>
              ))}
        </div>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[999] flex items-center justify-center p-6 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,.85)" }}
        >
          <img src={lightbox} alt="Registro ampliado" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </section>
  );
};

export default MetodologiaGaleria;
