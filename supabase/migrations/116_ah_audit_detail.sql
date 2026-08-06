-- ============================================================
-- 116 — Contenu détaillé des audits hygiène
-- Les réponses point par point et la checklist, pour pouvoir consulter le
-- rapport complet depuis le CRM sans dépendre de l'outil terrain.
-- ============================================================

ALTER TABLE ah_audits
  ADD COLUMN IF NOT EXISTS answers   jsonb,
  ADD COLUMN IF NOT EXISTS checklist jsonb;
