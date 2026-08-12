import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Clipping = {
  id: string;
  veiculo: string;
  titulo: string | null;
  url_materia: string | null;
  data_publicacao: string | null;
  image_path: string;
  ordem: number;
  ativo: boolean;
};

const MidiaClippingSection = () => {
  const { isAdmin, isAdminMaster, user } = useAuth();
  const canManage = !!user && (isAdmin || isAdminMaster);

  const [items, setItems] = useState<Clipping[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  // form
  const [open, setOpen] = useState(false);
  const [veiculo, setVeiculo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [urlMateria, setUrlMateria] = useState("");
  const [dataPub, setDataPub] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("midia_clipping")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    const list = (data || []) as Clipping[];
    setItems(list);
    if (list.length) {
      const { data: signed } = await supabase.storage
        .from("midia-clipping")
        .createSignedUrls(list.map((i) => i.image_path), 60 * 60 * 6);
      const map: Record<string, string> = {};
      (signed || []).forEach((s) => {
        if (s.signedUrl && s.path) map[s.path] = s.signedUrl;
      });
      setUrls(map);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMsg("Selecione o print (imagem).");
    if (!veiculo.trim()) return setMsg("Informe o veículo.");
    setSaving(true);
    setMsg(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("midia-clipping").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const ins = await supabase.from("midia_clipping").insert({
        veiculo: veiculo.trim(),
        titulo: titulo.trim() || null,
        url_materia: urlMateria.trim() || null,
        data_publicacao: dataPub || null,
        image_path: path,
        created_by: user?.id ?? null,
      });
      if (ins.error) throw ins.error;
      setVeiculo(""); setTitulo(""); setUrlMateria(""); setDataPub(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMsg("Print publicado com sucesso.");
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao publicar o print.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Clipping) => {
    if (!confirm(`Remover o print de "${item.veiculo}"?`)) return;
    await supabase.from("midia_clipping").delete().eq("id", item.id);
    await supabase.storage.from("midia-clipping").remove([item.image_path]);
    await load();
  };

  if (!items.length && !canManage) return null;

  const input: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)",
    color: "#ECF3EC", fontSize: 14,
  };

  return (
    <section id="saiu-na-midia" style={{ padding: "56px 0", background: "#0B2018" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span className="eyebrow" style={{ color: "#00A85A", letterSpacing: ".14em", fontSize: 12, fontWeight: 800 }}>
            SAIU NA MÍDIA
          </span>
          <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: "clamp(24px,4vw,36px)", color: "#fff", margin: "8px 0 6px", letterSpacing: "-.02em" }}>
            A imprensa acompanha a construção do Plano de Governo
          </h2>
          <p style={{ color: "rgba(236,243,236,.72)", fontSize: 15, maxWidth: 620, margin: "0 auto" }}>
            Veículos de comunicação de todo o Paraná noticiaram a participação popular no Juntos Paraná 399.
          </p>
        </div>

        {canManage && (
          <div style={{ maxWidth: 720, margin: "0 auto 28px" }}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              style={{ display: "block", margin: "0 auto", padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(0,168,90,.5)", background: "rgba(0,168,90,.14)", color: "#7CE0AE", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {open ? "Fechar" : "+ Subir print de mídia"}
            </button>
            {open && (
              <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12, padding: 18, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)" }}>
                <input style={input} placeholder="Veículo (ex.: Gazeta do Povo)" value={veiculo} onChange={(e) => setVeiculo(e.target.value)} />
                <input style={input} placeholder="Título da matéria (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <input style={input} placeholder="Link da matéria (opcional)" value={urlMateria} onChange={(e) => setUrlMateria(e.target.value)} />
                <input style={input} type="date" value={dataPub} onChange={(e) => setDataPub(e.target.value)} />
                <input ref={fileRef} style={input} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button type="submit" disabled={saving} style={{ padding: "12px 18px", borderRadius: 999, border: "none", background: "#00A85A", color: "#04180F", fontWeight: 800, cursor: "pointer", opacity: saving ? .6 : 1 }}>
                  {saving ? "Publicando..." : "Publicar print"}
                </button>
                {msg && <p style={{ color: "rgba(236,243,236,.8)", fontSize: 13, margin: 0 }}>{msg}</p>}
              </form>
            )}
          </div>
        )}

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
          {items.map((item) => (
            <figure key={item.id} style={{ margin: 0, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)" }}>
              {urls[item.image_path] && (
                <img
                  src={urls[item.image_path]}
                  alt={`${item.veiculo}${item.titulo ? " — " + item.titulo : ""}`}
                  loading="lazy"
                  onClick={() => setLightbox(urls[item.image_path])}
                  style={{ width: "100%", height: 200, objectFit: "cover", objectPosition: "top", display: "block", cursor: "zoom-in" }}
                />
              )}
              <figcaption style={{ padding: 14 }}>
                <strong style={{ color: "#00A85A", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>{item.veiculo}</strong>
                {item.titulo && <p style={{ color: "#fff", fontSize: 14, lineHeight: 1.4, margin: "6px 0 0" }}>{item.titulo}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  {item.data_publicacao && (
                    <span style={{ color: "rgba(236,243,236,.55)", fontSize: 12 }}>
                      {new Date(item.data_publicacao + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {item.url_materia && (
                    <a href={item.url_materia} target="_blank" rel="noopener noreferrer" style={{ color: "#7CE0AE", fontSize: 12, fontWeight: 700 }}>
                      Ver matéria →
                    </a>
                  )}
                  {canManage && (
                    <button type="button" onClick={() => remove(item)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#F87171", fontSize: 12, cursor: "pointer" }}>
                      remover
                    </button>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(4,12,8,.92)", zIndex: 90, display: "grid", placeItems: "center", padding: 24, cursor: "zoom-out" }}
        >
          <img src={lightbox} alt="Print ampliado" style={{ maxWidth: "min(1000px,92vw)", maxHeight: "88vh", borderRadius: 12 }} />
        </div>
      )}
    </section>
  );
};

export default MidiaClippingSection;
