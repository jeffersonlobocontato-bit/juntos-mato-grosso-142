
DROP POLICY IF EXISTS "Anyone can view municipios" ON municipios;
CREATE POLICY "Anyone can view municipios" ON municipios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view eixos" ON eixos_tematicos;
CREATE POLICY "Anyone can view eixos" ON eixos_tematicos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view temas" ON temas;
CREATE POLICY "Anyone can view temas" ON temas FOR SELECT USING (true);
