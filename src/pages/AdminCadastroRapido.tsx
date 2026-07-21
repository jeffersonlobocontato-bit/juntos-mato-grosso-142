import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, X, FileText, Plus, ArrowUp, ArrowDown } from 'lucide-react';

type Eixo = { id: string; nome: string };

type PageItem = {
  id: string;
  name: string;
  type: string;
  preview: string | null;
  url?: string;
  path?: string;
  uploading?: boolean;
  error?: boolean;
};

const AdminCadastroRapido = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [folder] = useState<string>(() => `cadastro-rapido/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eixoId, setEixoId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  useEffect(() => {
    supabase
      .from('eixos_tematicos')
      .select('id, nome')
      .order('ordem', { ascending: true })
      .then(({ data }) => {
        if (data) setEixos(data as Eixo[]);
      });
  }, []);

  const uploadOne = async (item: PageItem, file: File, index: number) => {
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${folder}/pagina-${String(index).padStart(3, '0')}-${item.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('ai-documents')
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('ai-documents').getPublicUrl(path);
      setPages((prev) => prev.map((p) => p.id === item.id ? { ...p, uploading: false, url: pub.publicUrl, path } : p));
    } catch (e: any) {
      console.error('upload page failed', e);
      setPages((prev) => prev.map((p) => p.id === item.id ? { ...p, uploading: false, error: true } : p));
      toast({ title: 'Falha ao enviar página', description: e?.message ?? 'Tente novamente', variant: 'destructive' });
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    const items: { item: PageItem; file: File }[] = files.map((f) => {
      const id = (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        item: {
          id,
          name: f.name,
          type: f.type,
          preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
          uploading: true,
        },
        file: f,
      };
    });
    setPages((prev) => {
      const next = [...prev, ...items.map((x) => x.item)];
      return next;
    });
    if (!title && items[0]) setTitle(items[0].file.name.replace(/\.[^/.]+$/, ''));
    // Kick off uploads immediately so state loss (PWA/camera return) can't wipe pages
    items.forEach(({ item, file }, i) => {
      // index by current length + i (approximate order)
      void uploadOne(item, file, pages.length + i + 1);
    });
  };

  const removePage = (id: string) => {
    setPages((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p?.preview) URL.revokeObjectURL(p.preview);
      if (p?.path) {
        supabase.storage.from('ai-documents').remove([p.path]).catch(() => {});
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const movePage = (id: string, dir: -1 | 1) => {
    setPages((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const reset = () => {
    pages.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    setPages([]);
    setTitle('');
    setDescription('');
    setEixoId('');
    setDone(false);
  };

  const handleSubmit = async () => {
    if (pages.length === 0) {
      toast({ title: 'Adicione ao menos uma foto ou arquivo', variant: 'destructive' });
      return;
    }
    if (pages.some((p) => p.uploading)) {
      toast({ title: 'Aguarde o upload das páginas terminar', variant: 'destructive' });
      return;
    }
    if (pages.some((p) => p.error || !p.url)) {
      toast({ title: 'Uma ou mais páginas falharam. Remova ou reenvie.', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Informe um título', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const uploaded = pages.map((p) => ({ url: p.url!, name: p.name, type: p.type }));

      const primary = uploaded[0];
      const pagesList = uploaded.map((u, idx) => `Página ${idx + 1}: ${u.url}`).join('\n');
      const content = `[Cadastro Rápido] Documento com ${uploaded.length} página(s).\n${description || ''}\n\n${pagesList}`.trim();

      const { error: insErr } = await supabase.from('ai_documents').insert({
        title: title.trim(),
        description: description.trim() || null,
        content,
        file_url: primary.url,
        file_name: primary.name,
        file_type: primary.type,
        doc_category: 'documento_tecnico',
        eixo_id: eixoId || null,
        uploaded_by: user?.id || null,
        is_active: true,
        scope: 'global',
        metadata: { pages: uploaded, page_count: uploaded.length, source: 'cadastro_rapido' } as any,
      } as any);
      if (insErr) throw insErr;

      toast({ title: 'Documento enviado!', description: `${uploaded.length} página(s) na Biblioteca.` });
      setDone(true);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao enviar', description: e?.message ?? 'Tente novamente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-safe">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
          </Button>
          <h1 className="text-lg font-display font-bold">Cadastro Rápido</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-xl">
        {done ? (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Documento enviado com sucesso</h2>
              <p className="text-sm text-muted-foreground">Ele já está disponível na Biblioteca de Documentos.</p>
              <div className="flex gap-2 justify-center pt-2">
                <Button onClick={reset}>Enviar outro</Button>
                <Button variant="outline" asChild><Link to="/admin/biblioteca">Ir para Biblioteca</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Envie um documento em segundos</CardTitle>
              <p className="text-sm text-muted-foreground">Fotografe ou anexe um arquivo do celular. Ele será enviado para a Biblioteca.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="default"
                  className="h-24 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6" />
                  {pages.length > 0 ? 'Tirar mais uma foto' : 'Tirar foto'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6" />
                  {pages.length > 0 ? 'Adicionar arquivo' : 'Enviar arquivo'}
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  multiple
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  className="hidden"
                  multiple
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
              </div>

              {pages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{pages.length} página(s) no documento</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => cameraInputRef.current?.click()}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar página
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {pages.map((p, idx) => (
                      <div key={p.id} className="relative rounded-lg border overflow-hidden bg-muted/40">
                        {p.preview ? (
                          <img src={p.preview} alt={`Página ${idx + 1}`} className="w-full aspect-[3/4] object-cover" />
                        ) : (
                          <div className="w-full aspect-[3/4] flex flex-col items-center justify-center p-2 text-center">
                            <FileText className="w-8 h-8 text-muted-foreground mb-1" />
                            <span className="text-[10px] break-all">{p.file.name}</span>
                          </div>
                        )}
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold rounded px-1.5 py-0.5">
                          {idx + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePage(p.id)}
                          className="absolute top-1 right-1 bg-background/90 rounded-full p-1 text-destructive"
                          aria-label="Remover página"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => movePage(p.id, -1)}
                            disabled={idx === 0}
                            className="bg-background/90 rounded p-1 disabled:opacity-40"
                            aria-label="Mover para cima"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePage(p.id, 1)}
                            disabled={idx === pages.length - 1}
                            className="bg-background/90 rounded p-1 disabled:opacity-40"
                            aria-label="Mover para baixo"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Ata da reunião com prefeito" />
              </div>

              <div className="space-y-2">
                <Label>Eixo Temático</Label>
                <Select value={eixoId || '__none__'} onValueChange={(v) => setEixoId(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Não se aplica</SelectItem>
                    {eixos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Observações</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto ou detalhes (opcional)" className="min-h-[90px]" />
              </div>

              <Button onClick={handleSubmit} disabled={saving || pages.length === 0} className="w-full h-12 text-base font-bold">
                {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>) : `Enviar documento${pages.length > 1 ? ` (${pages.length} páginas)` : ''}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminCadastroRapido;