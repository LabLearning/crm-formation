import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api-auth'
import { withDocumentLogo } from '@/lib/pdf/org-logo'
import { OrganigrammePDF, type Pole } from '@/lib/pdf/organigramme-pdf'

export const dynamic = 'force-dynamic'

/**
 * Organigramme fonctionnel (indicateur 18), construit depuis les comptes et
 * rôles réels : direction, pôles administratif et commercial, référents,
 * effectif de l'équipe pédagogique externe.
 */
export async function GET() {
  const auth = await requireApiUser()
  if ('error' in auth) return auth.error
  const orgId = auth.user.organizationId
  const supabase = await createServiceRoleClient()

  const [{ data: orgRow }, { data: users }, { count: nbFormateurs }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
    supabase.from('users')
      .select('first_name, last_name, email, role')
      .eq('organization_id', orgId)
      .in('role', ['super_admin', 'gestionnaire', 'directeur_commercial', 'commercial']),
    supabase.from('formateurs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
  ])

  const o: any = orgRow || {}
  const nom = (u: any) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
  const interne = (users || []).filter((u: any) => !String(u.email || '').includes('@gwshare') && !String(u.email || '').includes('@copawoke'))
  // Une même personne peut avoir plusieurs comptes : on garde le premier par nom.
  const vus = new Set<string>()
  const uniques = interne.filter((u: any) => {
    const k = nom(u).toLowerCase()
    if (!k || vus.has(k)) return false
    vus.add(k); return true
  })

  const representant = [o.representant_legal_prenom, o.representant_legal_nom].filter(Boolean).join(' ')
  const direction = uniques.filter((u: any) => u.role === 'super_admin' && nom(u).toLowerCase() !== representant.toLowerCase())
  const gestionnaires = uniques.filter((u: any) => u.role === 'gestionnaire')
  const commerciaux = uniques.filter((u: any) => ['commercial', 'directeur_commercial'].includes(u.role))

  const poles: Pole[] = [
    {
      titre: 'Direction',
      champ: "Représentation légale, stratégie, décisions qualité et sanctions",
      personnes: [
        ...(representant ? [{ nom: representant, fonction: o.representant_legal_fonction || 'Président' }] : []),
        ...direction.map((u: any) => ({ nom: nom(u), fonction: 'Direction opérationnelle et pédagogique', email: u.email })),
      ],
    },
    ...(gestionnaires.length ? [{
      titre: 'Pôle administratif',
      champ: 'Dossiers de formation, conventions, facturation, suivi OPCO',
      personnes: gestionnaires.map((u: any) => ({ nom: nom(u), fonction: 'Gestionnaire', email: u.email })),
    }] : []),
    ...(commerciaux.length ? [{
      titre: 'Pôle commercial',
      champ: 'Analyse du besoin, devis et simulateur budget, relation entreprises',
      personnes: commerciaux.map((u: any) => ({ nom: nom(u), fonction: 'Commercial', email: u.email })),
    }] : []),
    {
      titre: 'Référents',
      champ: 'Interlocuteurs nommés exigés par le référentiel',
      personnes: [
        ...(o.referent_handicap_nom ? [{ nom: o.referent_handicap_nom, fonction: 'Référent handicap', email: o.referent_handicap_email }] : []),
        ...(representant ? [{ nom: representant, fonction: 'Référent pédagogique et administratif' }] : []),
      ],
    },
  ]

  const org = await withDocumentLogo(supabase, orgRow)
  const buffer = await renderToBuffer(
    createElement(OrganigrammePDF, { org, poles, nbFormateurs: nbFormateurs || 0 }) as any,
  )
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="organigramme-lab-learning.pdf"',
    },
  })
}
