
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add scope column to ai_documents
ALTER TABLE public.ai_documents ADD COLUMN scope text NOT NULL DEFAULT 'global';

-- Create ai_document_chunks table
CREATE TABLE public.ai_document_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding extensions.vector(768),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for vector similarity search
CREATE INDEX idx_ai_document_chunks_embedding ON public.ai_document_chunks 
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Index for document lookup
CREATE INDEX idx_ai_document_chunks_document_id ON public.ai_document_chunks(document_id);

-- Enable RLS
ALTER TABLE public.ai_document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage ai_document_chunks"
  ON public.ai_document_chunks FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authorized users can view ai_document_chunks"
  ON public.ai_document_chunks FOR SELECT
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'lider_tematico'::app_role));

-- Function for semantic similarity search
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding extensions.vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_doc_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    adc.id,
    adc.document_id,
    adc.content,
    adc.chunk_index,
    1 - (adc.embedding OPERATOR(extensions.<=>) query_embedding)::float AS similarity
  FROM public.ai_document_chunks adc
  WHERE
    (array_length(filter_doc_ids, 1) IS NULL OR adc.document_id = ANY(filter_doc_ids))
    AND adc.embedding IS NOT NULL
    AND 1 - (adc.embedding OPERATOR(extensions.<=>) query_embedding)::float > match_threshold
  ORDER BY adc.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$$;
