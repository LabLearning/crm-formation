import { z } from 'zod'

// Un booléen de FormData arrive en chaîne : z.coerce.boolean() transformait
// "false" en true (Boolean("false") === true). Ce helper parse honnêtement.
const boolChamp = () => z.preprocess(
  (v) => (v == null ? v : v === true || v === 'true' || v === 'on' || v === '1'),
  z.boolean(),
)


export const createQCMSchema = z.object({
  titre: z.string().min(3, 'Titre requis'),
  description: z.string().optional(),
  type: z.enum(['positionnement', 'entree', 'sortie', 'satisfaction_chaud', 'satisfaction_froid']),
  formation_id: z.string().uuid().optional().or(z.literal('')),
  duree_minutes: z.coerce.number().int().min(0).optional(),
  score_min_reussite: z.coerce.number().min(0).max(100).optional(),
  questions_aleatoires: boolChamp().optional(),
  afficher_resultats: boolChamp().optional(),
  is_template: boolChamp().optional(),
})

export const createQuestionSchema = z.object({
  qcm_id: z.string().uuid(),
  texte: z.string().min(3, 'Question requise'),
  type: z.enum(['choix_unique', 'choix_multiple', 'vrai_faux', 'note_1_5', 'note_1_10', 'texte_libre', 'nps']),
  explication: z.string().optional(),
  points: z.coerce.number().min(0).default(1),
  is_required: boolChamp().default(true),
  section: z.string().optional(),
})

export type CreateQCMInput = z.infer<typeof createQCMSchema>
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>
