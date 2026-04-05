import { createServerSupabaseClient } from '@/lib/supabase/server'

interface SendEmailParams {
  organizationId: string
  templateSlug: string
  toEmail: string
  toName?: string
  variables: Record<string, string>
  entityType?: string
  entityId?: string
  triggeredBy?: string
}

// Base HTML wrapper for all emails
function wrapInLayout(content: string, orgName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#1E40AF,#3B82F6);padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${orgName}</h1>
  </td></tr>
  <tr><td style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">
    ${content}
  </td></tr>
  <tr><td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">${orgName} — Organisme de formation</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return rendered
}

export async function sendTemplateEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string; emailLogId?: string }> {
  const supabase = await createServerSupabaseClient()

  // Fetch template
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .eq('organization_id', params.organizationId)
    .eq('slug', params.templateSlug)
    .eq('is_active', true)
    .single()

  if (!template) {
    return { success: false, error: `Template "${params.templateSlug}" introuvable ou inactif` }
  }

  // Fetch org info
  const { data: org } = await supabase
    .from('organizations')
    .select('name, email')
    .eq('id', params.organizationId)
    .single()

  const allVars = {
    ...params.variables,
    nom_organisme: org?.name || '',
  }

  const subject = renderTemplate(template.sujet, allVars)
  const htmlBody = renderTemplate(template.corps_html, allVars)
  const fullHtml = wrapInLayout(htmlBody, org?.name || 'FormaCRM')

  // Log the email
  const { data: emailLog } = await supabase
    .from('email_logs')
    .insert({
      organization_id: params.organizationId,
      to_email: params.toEmail,
      to_name: params.toName || null,
      subject,
      template: params.templateSlug,
      variables: allVars,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      triggered_by: params.triggeredBy || null,
      status: 'pending',
    })
    .select()
    .single()

  // Send via Resend
  try {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      // Dev mode: just mark as sent
      if (emailLog) {
        await supabase.from('email_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', emailLog.id)
      }
      console.log(`[Email] DEV MODE — To: ${params.toEmail}, Subject: ${subject}`)
      return { success: true, emailLogId: emailLog?.id }
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${org?.name || 'FormaCRM'} <${org?.email || 'noreply@formacrm.fr'}>`,
        to: [params.toEmail],
        subject,
        html: fullHtml,
      }),
    })

    const result = await response.json()

    if (response.ok) {
      if (emailLog) {
        await supabase.from('email_logs').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          resend_id: result.id,
        }).eq('id', emailLog.id)
      }
      return { success: true, emailLogId: emailLog?.id }
    } else {
      if (emailLog) {
        await supabase.from('email_logs').update({
          status: 'failed',
          error: result.message || 'Erreur Resend',
        }).eq('id', emailLog.id)
      }
      return { success: false, error: result.message || 'Erreur d\'envoi' }
    }
  } catch (err) {
    if (emailLog) {
      await supabase.from('email_logs').update({
        status: 'failed',
        error: String(err),
      }).eq('id', emailLog.id)
    }
    return { success: false, error: 'Erreur réseau' }
  }
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrateur',
  gestionnaire: 'Gestionnaire',
  commercial: 'Commercial',
  comptable: 'Comptable',
  formateur: 'Formateur',
  apprenant: 'Apprenant',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'Accès complet à toutes les fonctionnalités du CRM',
  gestionnaire: 'Gestion des formations, apprenants, dossiers et conventions',
  commercial: 'Pipeline commercial, leads, outils de prospection et simulateur OPCO',
  comptable: 'Facturation, paiements, pièces comptables et reporting financier',
  formateur: 'Gestion de vos sessions, émargement et suivi des apprenants',
  apprenant: 'Accès à vos formations, documents et questionnaires',
}

function buildInvitationHtml(params: {
  inviteUrl: string
  role: string
  orgName: string
  invitedByName: string
}): string {
  const roleLabel = ROLE_LABELS[params.role] || params.role
  const roleDesc = ROLE_DESCRIPTIONS[params.role] || ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation ${params.orgName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f0;padding:48px 20px;">
<tr><td align="center">
<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;">

  <!-- Header -->
  <tr><td style="background-color:#195144;border-radius:16px 16px 0 0;padding:28px 36px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <div style="display:inline-block;background-color:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;">
            <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">Lab Learning</span>
          </div>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Organisme de formation professionnelle certifié Qualiopi</p>
        </td>
        <td align="right" style="vertical-align:middle;">
          <div style="width:42px;height:42px;background-color:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
            <span style="color:#ffffff;font-size:20px;">&#10003;</span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:#ffffff;padding:40px 36px;">

    <h1 style="margin:0 0 8px;color:#1a2e1f;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
      Vous avez été invité
    </h1>
    <p style="margin:0 0 28px;color:#5a7a6a;font-size:15px;line-height:1.5;">
      <strong style="color:#195144;">${params.invitedByName}</strong> vous invite à rejoindre l'espace
      de gestion <strong style="color:#1a2e1f;">${params.orgName}</strong>.
    </p>

    <!-- Role card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
      <tr><td style="background-color:#f0f7f4;border-left:4px solid #195144;border-radius:0 10px 10px 0;padding:16px 20px;">
        <p style="margin:0 0 4px;color:#5a7a6a;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Votre rôle</p>
        <p style="margin:0 0 6px;color:#1a2e1f;font-size:16px;font-weight:700;">${roleLabel}</p>
        <p style="margin:0;color:#5a7a6a;font-size:13px;line-height:1.5;">${roleDesc}</p>
      </td></tr>
    </table>

    <!-- Steps -->
    <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:600;">Pour accéder à votre espace :</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:32px;">
      ${['Cliquez sur le bouton ci-dessous', 'Choisissez votre mot de passe', 'Accédez à votre tableau de bord'].map((step, i) => `
      <tr><td style="padding:6px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0"><tr>
          <td style="width:26px;height:26px;background-color:#195144;border-radius:50%;text-align:center;vertical-align:middle;">
            <span style="color:#ffffff;font-size:12px;font-weight:700;">${i + 1}</span>
          </td>
          <td style="padding-left:12px;color:#4b5563;font-size:14px;">${step}</td>
        </tr></table>
      </td></tr>`).join('')}
    </table>

    <!-- CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 32px;">
      <tr><td style="border-radius:10px;background-color:#195144;">
        <a href="${params.inviteUrl}" target="_blank"
           style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
          Créer mon compte &rarr;
        </a>
      </td></tr>
    </table>

    <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
      Ce lien est valable 48 heures.<br>
      Si vous n'attendiez pas cette invitation, ignorez simplement cet email.
    </p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#f8faf9;border-radius:0 0 16px 16px;border-top:1px solid #e5ede9;padding:20px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">${params.orgName}</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;">
      Organisme de formation certifié Qualiopi &bull; Formation professionnelle
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendInvitationEmail(params: {
  toEmail: string
  role: string
  orgName: string
  orgEmail: string
  invitedByName: string
  inviteUrl: string
}): Promise<{ success: boolean; error?: string }> {
  const subject = `Invitation à rejoindre ${params.orgName}`
  const html = buildInvitationHtml({
    inviteUrl: params.inviteUrl,
    role: params.role,
    orgName: params.orgName,
    invitedByName: params.invitedByName,
  })

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(`[Invitation Email] DEV MODE — To: ${params.toEmail}`)
    console.log(`[Invitation Email] Invite URL: ${params.inviteUrl}`)
    return { success: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: `${params.orgName} <${params.orgEmail}>`,
      to: [params.toEmail],
      subject,
      html,
    }),
  })

  if (response.ok) return { success: true }

  const err = await response.json()
  return { success: false, error: err.message || 'Erreur Resend' }
}

type PortalType = 'apprenant' | 'formateur' | 'client' | 'apporteur' | 'partenaire'

const PORTAL_CONFIG: Record<PortalType, { title: string; subtitle: string; accentColor: string; accesses: string[] }> = {
  apprenant: {
    title: 'Espace Apprenant',
    subtitle: 'Votre espace de formation personnel',
    accentColor: '#7C3AED',
    accesses: [
      'Consulter vos formations et votre planning',
      'Accéder à vos documents et attestations',
      'Passer vos questionnaires et QCM',
      'Voir vos évaluations de satisfaction',
    ],
  },
  formateur: {
    title: 'Espace Formateur',
    subtitle: 'Votre interface de gestion des sessions',
    accentColor: '#0891B2',
    accesses: [
      'Consulter votre planning de sessions',
      'Gérer l\'émargement numérique',
      'Suivre vos apprenants par session',
      'Accéder à vos documents de formation',
    ],
  },
  client: {
    title: 'Espace Client',
    subtitle: 'L\'espace dédié à votre entreprise',
    accentColor: '#195144',
    accesses: [
      'Suivre le planning de vos formations',
      'Consulter et signer vos conventions',
      'Accéder à vos factures',
      'Gérer vos documents',
    ],
  },
  apporteur: {
    title: 'Espace Apporteur',
    subtitle: 'Votre tableau de bord apporteur d\'affaires',
    accentColor: '#B45309',
    accesses: [
      'Suivre vos leads apportés et leur avancement',
      'Consulter le détail de vos commissions',
      'Voir le statut de chaque dossier',
    ],
  },
  partenaire: {
    title: 'Espace Partenaire',
    subtitle: 'Votre tableau de bord franchise',
    accentColor: '#195144',
    accesses: [
      'Tableau de bord avec CA et indicateurs clés',
      'Suivre vos sessions de formation',
      'Consulter vos commissions en temps réel',
      'Gérer vos dossiers de formation',
    ],
  },
}

function buildPortalAccessHtml(params: {
  portalUrl: string
  portalType: PortalType
  firstName: string
  orgName: string
}): string {
  const config = PORTAL_CONFIG[params.portalType]

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title} - ${params.orgName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f0;padding:48px 20px;">
<tr><td align="center">
<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;">

  <!-- Header -->
  <tr><td style="background-color:#195144;border-radius:16px 16px 0 0;padding:28px 36px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <div style="display:inline-block;background-color:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;">
            <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">${params.orgName}</span>
          </div>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">Organisme de formation professionnelle certifié Qualiopi</p>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="background-color:${config.accentColor};border-radius:8px;padding:6px 12px;display:inline-block;">
            <span style="color:#ffffff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${config.title}</span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:#ffffff;padding:40px 36px;">

    <h1 style="margin:0 0 8px;color:#1a2e1f;font-size:23px;font-weight:700;letter-spacing:-0.5px;">
      Bonjour ${params.firstName},
    </h1>
    <p style="margin:0 0 28px;color:#5a7a6a;font-size:15px;line-height:1.6;">
      <strong style="color:#1a2e1f;">${params.orgName}</strong> vous ouvre l'accès à votre espace personnel.<br>
      ${config.subtitle}.
    </p>

    <!-- Access list -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:32px;">
      <tr><td style="background-color:#f0f7f4;border-radius:12px;padding:20px 24px;">
        <p style="margin:0 0 14px;color:#195144;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Ce que vous pouvez faire</p>
        ${config.accesses.map(a => `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:8px;"><tr>
          <td style="width:20px;vertical-align:top;padding-top:2px;">
            <div style="width:16px;height:16px;background-color:#195144;border-radius:50%;text-align:center;line-height:16px;">
              <span style="color:#ffffff;font-size:10px;font-weight:700;">&#10003;</span>
            </div>
          </td>
          <td style="padding-left:10px;color:#374151;font-size:14px;line-height:1.5;">${a}</td>
        </tr></table>`).join('')}
      </td></tr>
    </table>

    <!-- No password note -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
      <tr><td style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          <strong>Accès simplifié</strong> — Aucun mot de passe requis. Cliquez simplement sur le bouton ci-dessous pour accéder directement à votre espace.
        </p>
      </td></tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 32px;">
      <tr><td style="border-radius:10px;background-color:#195144;">
        <a href="${params.portalUrl}" target="_blank"
           style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
          Accéder à mon espace &rarr;
        </a>
      </td></tr>
    </table>

    <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.7;">
      Ce lien est personnel et sécurisé. Ne le partagez pas.<br>
      Si vous avez des questions, contactez-nous à <a href="mailto:digital@lab-learning.fr" style="color:#195144;">digital@lab-learning.fr</a>
    </p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#f8faf9;border-radius:0 0 16px 16px;border-top:1px solid #e5ede9;padding:20px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">${params.orgName}</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;">
      Organisme de formation certifié Qualiopi &bull; Formation professionnelle
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendPortalAccessEmail(params: {
  toEmail: string
  firstName: string
  portalType: PortalType
  portalUrl: string
  orgName: string
  orgEmail: string
}): Promise<{ success: boolean; error?: string }> {
  const config = PORTAL_CONFIG[params.portalType]
  const subject = `Votre ${config.title} est prêt — ${params.orgName}`
  const html = buildPortalAccessHtml({
    portalUrl: params.portalUrl,
    portalType: params.portalType,
    firstName: params.firstName,
    orgName: params.orgName,
  })

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(`[Portal Email] DEV MODE — Type: ${params.portalType}, To: ${params.toEmail}`)
    console.log(`[Portal Email] URL: ${params.portalUrl}`)
    return { success: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: `${params.orgName} <${params.orgEmail}>`,
      to: [params.toEmail],
      subject,
      html,
    }),
  })

  if (response.ok) return { success: true }
  const err = await response.json()
  return { success: false, error: err.message || 'Erreur Resend' }
}

export async function sendNewLeadFromApporteurEmail(params: {
  adminEmail: string
  orgName: string
  apporteurName: string
  apporteurEmail: string
  lead: {
    contact_prenom: string
    contact_nom: string
    contact_email: string
    contact_telephone: string
    entreprise: string
    formation_souhaitee: string
    nombre_stagiaires: string
    date_souhaitee: string
    commentaire: string
  }
  dashboardUrl: string
}): Promise<{ success: boolean; error?: string }> {
  const { adminEmail, orgName, apporteurName, apporteurEmail, lead, dashboardUrl } = params

  const rows: Array<[string, string]> = [
    ['Prénom', lead.contact_prenom],
    ['Nom', lead.contact_nom],
    ['Email', lead.contact_email],
    ['Téléphone', lead.contact_telephone],
    ['Entreprise', lead.entreprise],
    ['Formation souhaitée', lead.formation_souhaitee],
    ['Nombre de stagiaires', lead.nombre_stagiaires],
    ['Date souhaitée', lead.date_souhaitee],
    ['Commentaire', lead.commentaire],
  ]

  const tableRows = rows
    .filter(([, val]) => val && val.trim() !== '')
    .map(
      ([label, val]) => `
      <tr>
        <td style="padding:8px 12px;color:#5a7a6a;font-size:13px;font-weight:600;white-space:nowrap;border-bottom:1px solid #e5ede9;">${label}</td>
        <td style="padding:8px 12px;color:#1a2e1f;font-size:13px;border-bottom:1px solid #e5ede9;">${val}</td>
      </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau lead apporteur - ${orgName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f0;padding:48px 20px;">
<tr><td align="center">
<table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;">

  <!-- Header -->
  <tr><td style="background-color:#195144;border-radius:16px 16px 0 0;padding:28px 36px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <div style="display:inline-block;background-color:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;">
            <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">${orgName}</span>
          </div>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">Nouveau lead apporteur</p>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="background-color:rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;display:inline-block;">
            <span style="color:#ffffff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Lead entrant</span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:#ffffff;padding:40px 36px;">

    <h1 style="margin:0 0 8px;color:#1a2e1f;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
      Nouveau lead soumis
    </h1>
    <p style="margin:0 0 28px;color:#5a7a6a;font-size:15px;line-height:1.6;">
      Soumis par <strong style="color:#195144;">${apporteurName}</strong>
      (<a href="mailto:${apporteurEmail}" style="color:#195144;">${apporteurEmail}</a>)
    </p>

    <!-- Lead details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:32px;border:1px solid #e5ede9;border-radius:12px;overflow:hidden;">
      <tr><td style="background-color:#f0f7f4;padding:12px 16px;">
        <p style="margin:0;color:#195144;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Détails du lead</p>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${tableRows}
        </table>
      </td></tr>
    </table>

    <!-- CTA -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 32px;">
      <tr><td style="border-radius:10px;background-color:#195144;">
        <a href="${dashboardUrl}" target="_blank"
           style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
          Voir le lead dans le CRM &rarr;
        </a>
      </td></tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#f8faf9;border-radius:0 0 16px 16px;border-top:1px solid #e5ede9;padding:20px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">${orgName}</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;">
      Organisme de formation certifié Qualiopi &bull; Formation professionnelle
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(`[New Lead Email] DEV MODE — To: ${adminEmail}, Apporteur: ${apporteurName}`)
    return { success: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: `${orgName} <digital@lab-learning.fr>`,
      to: [adminEmail],
      subject: `Nouveau lead apporté par ${apporteurName} — ${orgName}`,
      html,
    }),
  })

  if (response.ok) return { success: true }
  const err = await response.json()
  return { success: false, error: err.message || 'Erreur Resend' }
}

export async function createNotification(params: {
  organizationId: string
  userId: string
  titre: string
  message: string
  type?: string
  lienUrl?: string
  lienLabel?: string
  entityType?: string
  entityId?: string
}) {
  const supabase = await createServerSupabaseClient()

  await supabase.from('notifications').insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    titre: params.titre,
    message: params.message,
    type: params.type || 'info',
    lien_url: params.lienUrl || null,
    lien_label: params.lienLabel || null,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
  })
}
