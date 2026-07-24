import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Domaines « placeholder » utilisés comme faux emails (imports, saisies de test).
 * Syntaxiquement valides mais non délivrables → bounce puis suppression Resend.
 * On exclut volontairement les vrais webmails (mail.com, gmail.com…).
 */
const PLACEHOLDER_EMAIL_DOMAINS = new Set([
  'email.com', 'example.com', 'example.org', 'example.net',
  'test.com', 'test.fr', 'exemple.com', 'exemple.fr',
  'domain.com', 'placeholder.com', 'localhost', 'none.com', 'xxx.com',
])

/** true si l'email a un domaine placeholder (ex. maria@email.com) */
export function isPlaceholderEmail(email?: string | null): boolean {
  if (!email) return false
  const domain = email.trim().toLowerCase().split('@')[1]
  return !!domain && PLACEHOLDER_EMAIL_DOMAINS.has(domain)
}
