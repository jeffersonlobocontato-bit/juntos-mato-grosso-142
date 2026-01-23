-- Add presentation column to store slide data
ALTER TABLE public.ai_chat_conversations
ADD COLUMN presentation JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_chat_conversations.presentation IS 
  'Estrutura da apresentação gerada: {slides: [{type, title, content, chart?, notes?}], generated_at, title, theme}';