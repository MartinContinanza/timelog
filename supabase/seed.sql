-- Subcuentas de ejemplo para TimeLog
-- Ejecutar en Supabase SQL Editor después de crear las tablas

INSERT INTO accounts (code, name, sector, active) VALUES
  ('CE.IS.MOLINOS',  'Auditoría ISCC — Molinos Río de la Plata',    'Certificación', true),
  ('CE.IS.ARCOR',    'Auditoría ISCC — Arcor S.A.',                 'Certificación', true),
  ('CE.2B.VICENTIN', 'Auditoría 2BSvs — Vicentin S.A.I.C.',         'Certificación', true),
  ('CE.2B.BUNGE',    'Auditoría 2BSvs — Bunge Argentina',           'Certificación', true),
  ('CE.RT.MAIZAR',   'Auditoría RTRS — Maizar Cooperativa',         'Certificación', true),
  ('CE.RT.AAPRESID', 'Auditoría RTRS — Aapresid',                   'Certificación', true),
  ('CE.SM.WALMART',  'Auditoría SMETA — Walmart Argentina',         'Certificación', true),
  ('CE.SM.CARREFOUR','Auditoría SMETA — Carrefour S.A.',            'Certificación', true),
  ('CE.EP.YPF',      'Auditoría EPA — YPF Agro',                    'Certificación', true),
  ('IN.ADM.GENERAL', 'Administración y gestión interna',            'Interno',       true)
ON CONFLICT (code) DO NOTHING;
