
DELETE FROM municipios WHERE nome = 'Vila Alta';
UPDATE municipios SET nome = 'Rancho Alegre D''Oeste' WHERE nome = 'Rancho Alegre d''Oeste';
INSERT INTO municipios (nome, codigo_ibge, latitude, longitude) VALUES
  ('Campina do Simão', '4104428', -25.0783, -51.8244),
  ('Francisco Alves', '4108452', -23.8586, -53.8083);
