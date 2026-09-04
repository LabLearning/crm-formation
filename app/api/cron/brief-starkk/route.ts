import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Le brief du matin de Starkk : chaque jour ouvré, l'équipe reçoit par email
 * le point du jour — sessions, signatures en attente, encours de facturation,
 * alertes AGEFICE. Composé depuis les mêmes données que les outils de
 * l'assistant. `?dry=1` renvoie le HTML sans envoyer (test).
 *
 * GET /api/cron/brief-starkk  (Authorization: Bearer CRON_SECRET)
 */
// Valeurs de l'ENUM user_role uniquement (« admin »/« manager » n'existent pas)
const ROLES_DESTINATAIRES = ['super_admin', 'gestionnaire', 'commercial']

const euros = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ')} €`
const frDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''

export async function GET(req: Request) {
  const unauthorized = verifyCronSecret(req)
  if (unauthorized) return unauthorized
  const dry = new URL(req.url).searchParams.get('dry') === '1'

  const supabase = await createServiceRoleClient()
  const { data: orgs } = await supabase.from('organizations').select('id, name, email')
  let envoyes = 0

  for (const org of orgs || []) {
    // Destinataires : l'équipe interne active avec email
    const { data: equipe } = await supabase.from('users')
      .select('email, first_name')
      .eq('organization_id', org.id).eq('status', 'active')
      .in('role', ROLES_DESTINATAIRES).not('email', 'is', null)
    if (!equipe?.length) continue

    const auj = new Date().toISOString().slice(0, 10)
    const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const on = (q: any) => q.eq('organization_id', org.id)

    const [sessJour, sessDemain, convs, dossiers, factRetard, recl] = await Promise.all([
      on(supabase.from('sessions').select('id, date_debut, date_fin, lieu, ville, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial), formateur:formateurs(prenom, nom)'))
        .lte('date_debut', auj).gte('date_fin', auj).not('status', 'in', '("annulee")'),
      on(supabase.from('sessions').select('id, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)'))
        .eq('date_debut', demain).not('status', 'in', '("annulee")'),
      on(supabase.from('conventions').select('id, numero, sent_at, session_id, client:client_id(raison_sociale, nom_commercial)'))
        .not('sent_at', 'is', null).is('signature_client_date', null).order('sent_at').limit(8),
      on(supabase.from('dossiers_agefice').select('id, numero_dossier, statut, mode_reglement, signature_stagiaire_date, date_fin_formation, session_id, apprenant:apprenant_id(prenom, nom)'))
        .neq('statut', 'solde'),
      on(supabase.from('factures').select('id, numero, montant_restant, client:client_id(raison_sociale, nom_commercial)'))
        .eq('status', 'en_retard').gt('montant_restant', 0).order('montant_restant', { ascending: false }),
      on(supabase.from('reclamations').select('id', { count: 'exact', head: true }))
        .not('status', 'in', '("cloturee","resolue")'),
    ])

    const nomCli = (c: any) => c?.nom_commercial || c?.raison_sociale || ''
    const maintenant = Date.now()
    const alertesAgefice = ((dossiers.data || []) as any[]).map((d) => {
      const points: string[] = []
      if (!d.mode_reglement) points.push('règlement du dirigeant à recevoir')
      else if (!d.signature_stagiaire_date) points.push('attestation à faire signer')
      if (d.date_fin_formation) {
        const restant = Math.round((new Date(d.date_fin_formation).getTime() + 122 * 86400000 - maintenant) / 86400000)
        if (restant < 45) points.push(`remboursement à demander sous ${restant} j`)
      }
      return points.length ? { nom: `${d.apprenant?.prenom || ''} ${d.apprenant?.nom || ''}`.trim(), numero: d.numero_dossier, points, lien: d.session_id ? `/dashboard/sessions/${d.session_id}?tab=facturation` : '/dashboard/agefice' } : null
    }).filter(Boolean) as any[]

    const retards = (factRetard.data || []) as any[]
    const totalRetard = retards.reduce((s, f) => s + Number(f.montant_restant || 0), 0)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'
    const lien = (path: string, label: string) => `<a href="${appUrl}${path}" style="color:#205040;font-weight:600;text-decoration:underline">${label}</a>`
    const section = (titre: string, corps: string) => corps ? `
      <tr><td style="padding:14px 0 4px"><span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#78716C">${titre}</span></td></tr>
      <tr><td style="font-size:14px;color:#1C1917;line-height:1.7">${corps}</td></tr>` : ''
    const puce = (t: string) => `<div style="padding:2px 0">• ${t}</div>`

    const corpsSessions = [
      ...((sessJour.data || []) as any[]).map((s) => puce(`${lien(`/dashboard/sessions/${s.id}`, s.formation?.intitule || 'Formation')} chez ${nomCli(s.client)}${s.formateur ? ` avec ${s.formateur.prenom} ${s.formateur.nom}` : ''}${s.lieu || s.ville ? ` (${s.lieu || s.ville})` : ''}`)),
      ...((sessDemain.data || []) as any[]).map((s) => puce(`Demain : ${lien(`/dashboard/sessions/${s.id}`, s.formation?.intitule || 'Formation')} chez ${nomCli(s.client)}`)),
    ].join('') || puce('Aucune session aujourd’hui ni demain.')

    const corpsSignatures = [
      ...((convs.data || []) as any[]).map((c) => puce(`Convention ${c.numero} de ${nomCli(c.client)}, envoyée le ${frDate(c.sent_at)} : ${lien(c.session_id ? `/dashboard/sessions/${c.session_id}?tab=conventions` : '/dashboard/conventions', 'relancer')}`)),
      ...alertesAgefice.map((a) => puce(`AGEFICE ${a.nom}${a.numero ? ` (n° ${a.numero})` : ''} : ${a.points.join(', ')} ${lien(a.lien, 'voir')}`)),
    ].join('')

    const corpsFactures = retards.length
      ? puce(`${retards.length} facture${retards.length > 1 ? 's' : ''} en retard pour ${euros(totalRetard)} ${lien('/dashboard/factures', 'voir tout')}`)
        + retards.slice(0, 3).map((f) => puce(`${f.numero} de ${nomCli(f.client)} : ${euros(Number(f.montant_restant))} dus`)).join('')
      : ''

    const corpsRecl = (recl.count || 0) > 0 ? puce(`${recl.count} réclamation${(recl.count || 0) > 1 ? 's' : ''} ouverte${(recl.count || 0) > 1 ? 's' : ''} ${lien('/dashboard/reclamations', 'traiter')}`) : ''

    const dateLongue = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const html = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding-bottom:6px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td><img src="${appUrl}/starkk.png" width="44" height="44" style="border-radius:50%;display:block" alt="Starkk"/></td>
              <td style="padding-left:12px">
                <div style="font-size:16px;font-weight:700;color:#14110F">Le brief de Starkk</div>
                <div style="font-size:12px;color:#78716C">${dateLongue.charAt(0).toUpperCase() + dateLongue.slice(1)}</div>
              </td>
            </tr></table>
          </td></tr>
          ${section('Sessions', corpsSessions)}
          ${section('Signatures et dossiers en attente', corpsSignatures)}
          ${section('Facturation', corpsFactures)}
          ${section('Réclamations', corpsRecl)}
          <tr><td style="padding-top:16px;font-size:12px;color:#78716C">
            Besoin d’un détail ? Ouvrez la bulle Starkk dans le CRM et demandez-lui.
          </td></tr>
        </table>
      </div>`

    if (dry) return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })

    const { sendBrandedEmail } = await import('@/lib/email')
    for (const u of equipe) {
      const r = await sendBrandedEmail({
        to: u.email,
        toName: u.first_name || undefined,
        subject: `Le brief de Starkk, ${dateLongue}`,
        html,
        orgName: org.name || 'Lab Learning',
        orgEmail: (org as any).email || undefined,
        organizationId: org.id,
        entityType: 'brief_starkk',
      })
      if (r.success) envoyes++
    }
  }

  return NextResponse.json({ success: true, envoyes })
}
