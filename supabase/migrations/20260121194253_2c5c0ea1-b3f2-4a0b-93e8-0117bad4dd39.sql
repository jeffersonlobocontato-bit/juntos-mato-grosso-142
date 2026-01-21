-- =============================================
-- FASE 1: Políticas de Storage para bucket tse-csv
-- =============================================

-- Política para permitir upload por admins
CREATE POLICY "Admins can upload TSE files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tse-csv' AND
  is_admin(auth.uid())
);

-- Política para permitir leitura por usuários autenticados
CREATE POLICY "Authenticated can read TSE files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tse-csv');

-- Política para permitir delete por admins
CREATE POLICY "Admins can delete TSE files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tse-csv' AND
  is_admin(auth.uid())
);

-- =============================================
-- FASE 2: Inserir Cargos Base do TSE
-- =============================================

INSERT INTO tse_cargos (codigo_tse, nome, abrangencia) VALUES
(1, 'Presidente', 'federal'),
(2, 'Vice-Presidente', 'federal'),
(3, 'Governador', 'estadual'),
(4, 'Vice-Governador', 'estadual'),
(5, 'Senador', 'estadual'),
(6, 'Deputado Federal', 'estadual'),
(7, 'Deputado Estadual', 'estadual'),
(8, 'Deputado Distrital', 'estadual'),
(9, '1º Suplente Senador', 'estadual'),
(10, '2º Suplente Senador', 'estadual'),
(11, 'Prefeito', 'municipal'),
(12, 'Vice-Prefeito', 'municipal'),
(13, 'Vereador', 'municipal')
ON CONFLICT (codigo_tse) DO NOTHING;

-- =============================================
-- FASE 3: Resetar Importações Travadas
-- =============================================

UPDATE tse_importacoes 
SET status = 'pendente', 
    erro_mensagem = 'Reset automático - tentativa anterior travada',
    updated_at = now()
WHERE status = 'processando' 
  AND updated_at < now() - interval '1 hour';