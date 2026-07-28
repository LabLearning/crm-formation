-- Lie chaque participant prévisionnel d'un lead à l'apprenant créé (rattaché
-- au client établissement), pour le retrouver/mettre à jour et l'utiliser
-- dans n'importe quelle session.
ALTER TABLE lead_participants
  ADD COLUMN IF NOT EXISTS apprenant_id uuid REFERENCES apprenants(id) ON DELETE SET NULL;
