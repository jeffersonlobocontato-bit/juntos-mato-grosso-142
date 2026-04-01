import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Plus,
  Link2,
  X,
  File,
  Type,
} from 'lucide-react';

type LinkedDoc = {
  id: string;
  title: string;
  doc_category: string;
  file_name: string | null;
};

type AllDoc = {
  id: string;
  title: string;
  doc_category: string;
};

interface ModeDocumentLibraryProps {
  agentConfigId: string;
  modeName: string;
}

export function ModeDocumentLibrary({ agentConfigId, modeName }: ModeDocumentLibraryProps) {
  const { toast } = useToast();
  const [linkedDocs, setLinkedDocs] = useState<LinkedDoc[]>([]);
  const [allDocs, setAllDocs] = useState<AllDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadContent, setUploadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchLinkedDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_agent_documents')
      .select('document_id, ai_documents(id, title, doc_category, file_name)')
      .eq('agent_id', agentConfigId);

    if (error) {
      console.error('Error fetching linked docs:', error);
      return;
    }

    const docs: LinkedDoc[] = (data || [])
      .map((row: any) => row.ai_documents)
      .filter(Boolean);
    setLinkedDocs(docs);
  }, [agentConfigId]);

  const fetchAllDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_documents')
      .select('id, title, doc_category')
      .eq('is_active', true)
      .order('title');

    if (!error && data) setAllDocs(data);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchLinkedDocs(), fetchAllDocs()]);
      setIsLoading(false);
    };
    load();
  }, [fetchLinkedDocs, fetchAllDocs]);

  const triggerChunking = async (documentId: string) => {
    try {
      await supabase.functions.invoke('process-document-chunks', {
        body: { document_id: documentId },
      });
    } catch (e) {
      console.error('Chunking trigger failed (non-blocking):', e);
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório.', variant: 'destructive' });
      return;
    }
    if (uploadMode === 'file' && !uploadFile) {
      toast({ title: 'Erro', description: 'Selecione um arquivo.', variant: 'destructive' });
      return;
    }
    if (uploadMode === 'text' && !uploadContent.trim()) {
      toast({ title: 'Erro', description: 'Conteúdo é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;
      let documentContent = uploadContent;

      if (uploadMode === 'file' && uploadFile) {
        fileName = uploadFile.name;
        fileType = uploadFile.type;
        const fileExt = uploadFile.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ai-documents')
          .upload(filePath, uploadFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ai-documents')
          .getPublicUrl(filePath);
        fileUrl = publicUrl;

        if (uploadFile.type === 'text/plain') {
          documentContent = await uploadFile.text();
        } else {
          documentContent = `[Arquivo: ${uploadFile.name}]\n\nConteúdo disponível em: ${publicUrl}`;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { data: newDoc, error: insertError } = await supabase
        .from('ai_documents')
        .insert({
          title: uploadTitle.trim(),
          content: documentContent,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          doc_category: 'outro',
          uploaded_by: user?.id || null,
          is_active: true,
          scope: 'agent_specific',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (newDoc) {
        await supabase.from('ai_agent_documents').insert({
          agent_id: agentConfigId,
          document_id: newDoc.id,
        });
        setLinkedDocs(prev => [...prev, {
          id: newDoc.id,
          title: newDoc.title,
          doc_category: newDoc.doc_category,
          file_name: newDoc.file_name,
        }]);
        // Trigger RAG chunking
        triggerChunking(newDoc.id);
      }

      toast({ title: 'Sucesso', description: 'Documento adicionado ao modo.' });
      setShowUploadForm(false);
      setUploadTitle('');
      setUploadFile(null);
      setUploadContent('');
    } catch (error) {
      console.error('Error uploading:', error);
      toast({ title: 'Erro', description: 'Erro ao enviar documento.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUnlink = async (docId: string) => {
    const { error } = await supabase
      .from('ai_agent_documents')
      .delete()
      .eq('agent_id', agentConfigId)
      .eq('document_id', docId);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao desvincular.', variant: 'destructive' });
      return;
    }
    setLinkedDocs(prev => prev.filter(d => d.id !== docId));
  };

  const handleToggleLink = async (docId: string) => {
    const isLinked = linkedDocs.some(d => d.id === docId);
    if (isLinked) {
      await handleUnlink(docId);
    } else {
      const { error } = await supabase
        .from('ai_agent_documents')
        .insert({ agent_id: agentConfigId, document_id: docId });
      if (error) {
        toast({ title: 'Erro', description: 'Erro ao vincular.', variant: 'destructive' });
        return;
      }
      const doc = allDocs.find(d => d.id === docId);
      if (doc) {
        setLinkedDocs(prev => [...prev, { ...doc, file_name: null }]);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const linkedIds = new Set(linkedDocs.map(d => d.id));

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Biblioteca de Documentos
          <Badge variant="secondary" className="text-xs">{linkedDocs.length}</Badge>
        </h4>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowLinkExisting(!showLinkExisting); setShowUploadForm(false); }}
          >
            <Link2 className="w-3.5 h-3.5 mr-1" />
            Vincular
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowUploadForm(!showUploadForm); setShowLinkExisting(false); }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo
          </Button>
        </div>
      </div>

      {/* Upload form */}
      {showUploadForm && (
        <div className="space-y-3 border rounded-md p-3 bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant={uploadMode === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('file')}
            >
              <File className="w-3.5 h-3.5 mr-1" />
              Arquivo
            </Button>
            <Button
              variant={uploadMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('text')}
            >
              <Type className="w-3.5 h-3.5 mr-1" />
              Texto
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowUploadForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Título *</Label>
            <Input
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              placeholder="Título do documento"
              className="h-8 text-sm"
            />
          </div>

          {uploadMode === 'file' ? (
            <div className="space-y-2">
              <Label className="text-xs">Arquivo</Label>
              <Input
                type="file"
                accept=".pdf,.txt,.doc,.docx,.csv"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Conteúdo</Label>
              <Textarea
                value={uploadContent}
                onChange={e => setUploadContent(e.target.value)}
                placeholder="Cole o conteúdo aqui..."
                className="min-h-[100px] text-sm"
              />
            </div>
          )}

          <Button size="sm" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Enviar
          </Button>
        </div>
      )}

      {/* Link existing docs */}
      {showLinkExisting && (
        <div className="border rounded-md p-3 bg-background max-h-48 overflow-y-auto space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Documentos disponíveis</span>
            <Button variant="ghost" size="sm" onClick={() => setShowLinkExisting(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {allDocs.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum documento na base.</p>
          )}
          {allDocs.map(doc => (
            <label key={doc.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox
                checked={linkedIds.has(doc.id)}
                onCheckedChange={() => handleToggleLink(doc.id)}
              />
              <span className="truncate flex-1">{doc.title}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{doc.doc_category}</Badge>
            </label>
          ))}
        </div>
      )}

      {/* Linked documents list */}
      {linkedDocs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum documento vinculado a este modo.</p>
      ) : (
        <div className="space-y-1">
          {linkedDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-background border">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{doc.title}</span>
              {doc.file_name && (
                <Badge variant="outline" className="text-[10px] shrink-0">{doc.file_name}</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => handleUnlink(doc.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
