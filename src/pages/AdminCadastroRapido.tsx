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
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, X, FileText } from 'lucide-react';

type Eixo = { id: string; nome: string };

const AdminCadastroRapido = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
      .from('eixos')
      .select('id, nome')
      .order('ordem', { ascending: true })
      .then(({ data }) => {
        if (data) setEixos(data as Eixo[]);
      });
  }, []);

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    if (f) {
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        setPreview(url);
      }
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTitle('');
    setDescription('');
    setEixoId('');
    setDone(false);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: 'Selecione ou fotografe um documento', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Informe um título', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `cadastro-rapido/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('ai-documents').upload(path, file, {
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('ai-documents').getPublicUrl(path);

      const { error: insErr } = await supabase.from('ai_documents').insert({
        title: title.trim(),
        description: description.trim() || null,
        content: `[Cadastro Rápido]\n${description || 'Documento capturado via celular.'}\nArquivo: ${pub.publicUrl}`,
        file_url: pub.publicUrl,
        file_name: file.name,
        file_type: file.type,
        doc_category: 'documento_tecnico',
        eixo_id: eixoId || null,
        uploaded_by: user?.id || null,
        is_active: true,
        scope: 'global',
      });
      if (insErr) throw insErr;

      toast({ title: 'Documento enviado!', description: 'Disponível na Biblioteca.' });
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
                  Tirar foto
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6" />
                  Enviar arquivo
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {file && (
                <div className="rounded-lg border p-3 flex items-start gap-3 relative">
                  <button
                    type="button"
                    onClick={() => handleFile(null)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    aria-label="Remover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {preview ? (
                    <img src={preview} alt="Prévia" className="w-20 h-20 object-cover rounded" />
                  ) : (
                    <div className="w-20 h-20 rounded bg-muted flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="font-medium break-all">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
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

              <Button onClick={handleSubmit} disabled={saving || !file} className="w-full h-12 text-base font-bold">
                {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>) : 'Enviar documento'}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminCadastroRapido;