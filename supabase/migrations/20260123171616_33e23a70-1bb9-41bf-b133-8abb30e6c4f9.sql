-- Table for publicly shared presentations
CREATE TABLE public.shared_presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  conversation_id UUID REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  presentation_data JSONB NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  view_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.shared_presentations ENABLE ROW LEVEL SECURITY;

-- Public read access for anyone with the link
CREATE POLICY "Anyone can view shared presentations"
ON public.shared_presentations
FOR SELECT
USING (true);

-- Authenticated users can create shared presentations
CREATE POLICY "Authenticated users can create shared presentations"
ON public.shared_presentations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Creators can delete their shared presentations
CREATE POLICY "Creators can delete their shared presentations"
ON public.shared_presentations
FOR DELETE
USING (auth.uid() = created_by);

-- Create index for faster public_id lookups
CREATE INDEX idx_shared_presentations_public_id ON public.shared_presentations(public_id);