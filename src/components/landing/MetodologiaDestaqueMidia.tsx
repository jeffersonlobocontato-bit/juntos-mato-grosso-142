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

type Brand = { navy: string; green500: string; green700: string };

type FormState = {
  veiculo: string;
  titulo: string;
  url_materia: string;
  data_publicacao: string;
};

const EMPTY: FormState = { veiculo: "", titulo: "", url_materia: "", data_publicacao: "" };

const PLACEHOLDERS: { veiculo: string }[] = [
  { veiculo: "Gazeta do Povo" },
  { veiculo: "Bem Paraná" },
  { veiculo: "Tribuna do Paraná" },
  { veiculo: "RPC" },
];

const MetodologiaDestaqueMidia = ({ brand }: { brand: Brand }) => {
  const { user, isAdmin, isAdminMaster } = useAuth();
  const canManage = !!user && (isAdmin || isAdminMaster);

  const [items, setItems] = useState<Clipping[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
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
    } else {
      setUrls({});
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(EMPTY);
    setFile(null);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (item: Clipping) => {
    setEditingId(item.id);
    setForm({
      veiculo: item.veiculo,
      titulo: item.titulo ?? "",
      url_materia: item.url_materia ?? "",
      data_publicacao: item.data_publicacao ?? "",
    });
    setFile(null);
    setOpen(true);
    setMsg(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.veiculo.trim()) return setMsg("Informe a tag/veículo.");
    if (!editingId && !file) return setMsg("Selecione a imagem do destaque.");
    setSaving(true);
    setMsg(null);
    try {
      let imagePath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("midia-clipping").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        imagePath = path;
      }

      const payload = {
        veiculo: form.veiculo.trim(),
        titulo: form.titulo.trim() || null,
        url_materia: form.url_materia.trim() || null,
        data_publicacao: form.data_publicacao || null,
      };

      if (editingId) {
        const current = items.find((i) => i.id === editingId);
        const upd = await supabase
          .from("midia_clipping")
          .update(imagePath ? { ...payload, image_path: imagePath } : payload)
          .eq("id", editingId);
        if (upd.error) throw upd.error;
        if (imagePath && current) {
          await supabase.storage.from("midia-clipping").remove([current.image_path]);
        }
        setMsg("Destaque atualizado.");
      } else {
        const ins = await supabase.from("midia_clipping").insert({
          ...payload,
          image_path: imagePath as string,
          created_by: user?.id ?? null,
        });
        if (ins.error) throw ins.error;
        setMsg("Destaque publicado.");
      }
      resetForm();
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar o destaque.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Clipping) => {
    if (!confirm(`Remover o destaque de "${item.veiculo}"?`)) return;
    await supabase.from("midia_clipping").delete().eq("id", item.id);
    await supabase.storage.from("midia-clipping").remove([item.image_path]);
    if (editingId === item.id) resetForm();
    await load();
  };

  const visible = showAll ? items : items.slice(0, 4);
  const usePlaceholders = items.length === 0;

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm bg-white";

  return (
    <section className="py-14 md:py-20" style={{ background: "#f7f8f5" }}>
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: brand.green700 }}>
            O Paraná está falando
          </span>
          <h2 className="font-black text-2xl md:text-3xl mt-2" style={{ color: brand.navy }}>
            Destaque na Mídia
          </h2>
          <p className="text-gray-500 text-sm mt-3 max-w-xl mx-auto">
            Repercutiu em veículos de comunicação de todo o Estado.
          </p>
        </div>

        {canManage && (
          <div className="max-w-3xl mx-auto mb-10">
            <button
              type="button"
              onClick={() => { setOpen((v) => !v); if (open) resetForm(); }}
              className="mx-auto block rounded-full px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: brand.green700 }}
            >
              {open ? "Fechar edição" : "+ Adicionar destaque na mídia"}
            </button>

            {open && (
              <form
                onSubmit={submit}
                className="mt-5 grid gap-3 rounded-2xl border bg-white p-5"
                style={{ borderColor: `${brand.green500}33` }}
              >
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: brand.navy }}>
                  {editingId ? "Editando destaque" : "Novo destaque"}
                </p>
                <input
                  className={inputCls}
                  placeholder="Tag / veículo (ex.: Gazeta do Povo)"
                  value={form.veiculo}
                  onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Título da matéria"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Link do 'Leia mais' (https://...)"
                  value={form.url_materia}
                  onChange={(e) => setForm({ ...form, url_materia: e.target.value })}
                />
                <input
                  className={inputCls}
                  type="date"
                  value={form.data_publicacao}
                  onChange={(e) => setForm({ ...form, data_publicacao: e.target.value })}
                />
                <input
                  ref={fileRef}
                  className={inputCls}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {editingId && (
                  <p className="text-xs text-gray-500 -mt-1">
                    Deixe o arquivo em branco para manter a imagem atual.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    style={{ background: brand.navy }}
                  >
                    {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Publicar destaque"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-full border px-6 py-2.5 text-sm font-bold"
                      style={{ borderColor: `${brand.navy}33`, color: brand.navy }}
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>
                {msg && <p className="text-xs text-gray-600 m-0">{msg}</p>}
              </form>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(usePlaceholders ? PLACEHOLDERS : visible).map((raw, i) => {
            const item = raw as Partial<Clipping> & { veiculo: string; titulo?: string | null };
            const img = item.image_path ? urls[item.image_path] : undefined;
            return (
              <div
                key={item.id ?? i}
                className="group rounded-2xl overflow-hidden bg-white shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                style={{ borderColor: `${brand.green500}33` }}
              >
                <div
                  className="relative flex items-start justify-center overflow-hidden"
                  style={{
                    aspectRatio: "16 / 10",
                    background: `linear-gradient(135deg, ${brand.navy}0d, ${brand.green500}0d)`,
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={`Matéria publicada em ${item.veiculo}`}
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: `${brand.green500}22`, color: brand.green700 }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <span
                    className="inline-block mb-3 text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full"
                    style={{ background: `${brand.navy}ee`, color: "#fff" }}
                  >
                    {item.veiculo}
                  </span>
                  <div className="flex items-center gap-4">
                    <a
                      href={item.url_materia || "#"}
                      target={item.url_materia ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={(e) => { if (!item.url_materia) e.preventDefault(); }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors group-hover:gap-2.5"
                      style={{ color: brand.green700 }}
                    >
                      Leia mais
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                    {canManage && item.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(item as Clipping)}
                          className="text-xs font-bold text-gray-500 hover:text-gray-700"
                        >
                          editar
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(item as Clipping)}
                          className="text-xs font-bold text-red-500 hover:text-red-600"
                        >
                          remover
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!usePlaceholders && items.length > 4 && (
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-sm text-white transition-all hover:gap-3 hover:shadow-lg"
              style={{ background: brand.navy }}
            >
              {showAll ? "VER MENOS" : "VER MAIS"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MetodologiaDestaqueMidia;
