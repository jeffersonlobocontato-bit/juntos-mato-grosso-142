-- Create ai_documents table for expanded document management
CREATE TABLE public.ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT, -- pdf, docx, xlsx, txt
  
  -- Classification (including 'documento_tecnico')
  doc_category TEXT NOT NULL CHECK (doc_category IN (
    'plano_governo', 
    'documento_tecnico', 
    'noticia', 
    'comprovacao', 
    'investimento', 
    'promessa', 
    'legislacao', 
    'outro'
  )),
  temporal_status TEXT CHECK (temporal_status IN (
    'realizado', 
    'em_andamento', 
    'prometido', 
    'nao_iniciado'
  )),
  
  -- Links for filtering
  eixo_id UUID REFERENCES eixos_tematicos(id),
  municipio_id UUID REFERENCES municipios(id),
  regiao TEXT,
  
  -- Metadata
  source_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- System
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage ai_documents"
ON public.ai_documents FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view ai_documents"
ON public.ai_documents FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'lider_tematico'::app_role)
);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-documents', 'ai-documents', true);

-- Storage policies
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ai-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'ai-documents' AND is_admin(auth.uid()));

CREATE POLICY "Anyone can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-documents');

-- Trigger for updated_at
CREATE TRIGGER update_ai_documents_updated_at
BEFORE UPDATE ON public.ai_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();