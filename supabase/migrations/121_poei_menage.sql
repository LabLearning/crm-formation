-- ============================================================
-- 121 — Ménage du modèle POEI
--
-- Le dossier POEI portait encore les champs de l'époque « un dossier = un
-- candidat » : nom, prénom, e-mail, téléphone, identifiant France Travail,
-- poste visé, type de contrat, date d'embauche, tuteur. Depuis l'introduction
-- de `poei_candidats`, ces colonnes sont VIDES sur la totalité des dossiers
-- (vérifié : 0/8) mais restaient lues comme valeurs de repli — un candidat
-- pouvait donc hériter d'informations d'un autre.
--
-- Le code ne les lit plus. On les supprime.
-- ============================================================

ALTER TABLE poei
  DROP COLUMN IF EXISTS candidat_civilite,
  DROP COLUMN IF EXISTS candidat_nom,
  DROP COLUMN IF EXISTS candidat_prenom,
  DROP COLUMN IF EXISTS candidat_email,
  DROP COLUMN IF EXISTS candidat_telephone,
  DROP COLUMN IF EXISTS candidat_identifiant_ft,
  DROP COLUMN IF EXISTS apprenant_id,
  DROP COLUMN IF EXISTS poste_vise,
  DROP COLUMN IF EXISTS type_contrat,
  DROP COLUMN IF EXISTS date_embauche_prevue,
  DROP COLUMN IF EXISTS tuteur_nom;

COMMENT ON TABLE poei IS 'Dossier POEI : une entreprise, une formation, une session, N candidats (poei_candidats)';
