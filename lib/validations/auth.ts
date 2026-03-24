import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const registerSchema = z.object({
  first_name: z.string().min(2, 'Minimum 2 caractères'),
  last_name: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  organization_name: z.string().min(2, 'Nom de l\'organisme requis'),
})

export const inviteUserSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  role: z.enum([
    'super_admin',
    'gestionnaire',
    'commercial',
    'comptable',
    'formateur',
    'apprenant',
  ], { message: 'Rôle invalide' }),
})

export const updateUserSchema = z.object({
  first_name: z.string().min(2, 'Minimum 2 caractères').optional(),
  last_name: z.string().min(2, 'Minimum 2 caractères').optional(),
  phone: z.string().optional(),
  role: z.enum([
    'super_admin',
    'gestionnaire',
    'commercial',
    'comptable',
    'formateur',
    'apprenant',
  ]).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères'),
  legal_name: z.string().optional(),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres').optional().or(z.literal('')),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  website: z.string().url('URL invalide').optional().or(z.literal('')),
  numero_da: z.string().optional(),
  is_qualiopi: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
