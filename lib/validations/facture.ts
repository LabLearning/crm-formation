import { z } from 'zod'

export const createFactureSchema = z.object({
  client_id: z.string().uuid('Client requis'),
  type: z.enum(['facture', 'acompte', 'solde', 'avoir']).default('facture'),
  devis_id: z.string().uuid().optional().or(z.literal('')),
  convention_id: z.string().uuid().optional().or(z.literal('')),
  dossier_id: z.string().uuid().optional().or(z.literal('')),
  session_id: z.string().uuid().optional().or(z.literal('')),
  facture_origine_id: z.string().uuid().optional().or(z.literal('')),
  objet: z.string().min(3, 'Objet requis'),
  date_echeance: z.string().min(1, 'Date d\'échéance requise'),
  conditions_paiement: z.string().optional(),
  remise_pourcent: z.coerce.number().min(0).max(100).default(0),
  taux_tva: z.coerce.number().min(0).max(100).default(20),
  financeur_type: z.string().optional().or(z.literal('')),
  financeur_nom: z.string().optional(),
  subrogation: z.coerce.boolean().optional(),
  notes_internes: z.string().optional(),
})

export const factureLigneSchema = z.object({
  designation: z.string().min(1, 'Désignation requise'),
  description: z.string().optional(),
  quantite: z.coerce.number().min(0.01),
  unite: z.string().default('forfait'),
  prix_unitaire_ht: z.coerce.number().min(0),
})

export const createPaiementSchema = z.object({
  facture_id: z.string().uuid(),
  montant: z.coerce.number().min(0.01, 'Montant requis'),
  mode: z.enum(['virement', 'cb', 'cheque', 'prelevement', 'especes', 'stripe', 'opco', 'cpf', 'autre']),
  date_paiement: z.string().min(1, 'Date requise'),
  reference: z.string().optional(),
  payeur_nom: z.string().optional(),
  payeur_type: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateFactureInput = z.infer<typeof createFactureSchema>
export type CreatePaiementInput = z.infer<typeof createPaiementSchema>
