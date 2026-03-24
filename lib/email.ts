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
