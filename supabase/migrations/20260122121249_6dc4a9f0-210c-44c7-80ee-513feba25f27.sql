-- Add byte offset column for efficient HTTP Range Request resumption
ALTER TABLE tse_importacoes 
ADD COLUMN IF NOT EXISTS current_byte_offset BIGINT DEFAULT 0;

-- Add total file size for progress calculation
ALTER TABLE tse_importacoes 
ADD COLUMN IF NOT EXISTS total_file_size BIGINT DEFAULT 0;

COMMENT ON COLUMN tse_importacoes.current_byte_offset IS 
  'Byte position in file for efficient resumption via HTTP Range Request';

COMMENT ON COLUMN tse_importacoes.total_file_size IS 
  'Total file size in bytes for progress percentage calculation';