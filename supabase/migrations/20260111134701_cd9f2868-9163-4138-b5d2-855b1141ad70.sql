-- Create storage bucket for TSE CSV files
INSERT INTO storage.buckets (id, name, public)
VALUES ('tse-csv', 'tse-csv', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for TSE CSV bucket - only admins can upload/manage
CREATE POLICY "Admins can upload TSE CSV files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tse-csv' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can view TSE CSV files"
ON storage.objects FOR SELECT
USING (bucket_id = 'tse-csv' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete TSE CSV files"
ON storage.objects FOR DELETE
USING (bucket_id = 'tse-csv' AND public.is_admin(auth.uid()));

-- Add unique constraint for import tracking
ALTER TABLE public.tse_importacoes
ADD CONSTRAINT tse_importacoes_ano_uf_tipo_unique 
UNIQUE (ano, uf, tipo_arquivo);

-- Add file reference column
ALTER TABLE public.tse_importacoes
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS current_batch INTEGER DEFAULT 0;