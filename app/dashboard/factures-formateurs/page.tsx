import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ReceiptText } from 'lucide-react'
import { FacturesFormateursList } from './FacturesFormateursList'

export const dynamic = 'force-dynamic'

export default async function FacturesFormateursPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: facturesRaw } = await supabase
    .from('factures_formateur')
    .select('*, formateur:formateur_id(prenom, nom), session:session_id(reference)')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })
  const factures = (facturesRaw || []) as any[]

  // URLs signées des PDF déposés (bucket privé)
  const paths = factures.map((f) => f.fichier_url).filter((u) => u && !/^https?:\/\//.test(u)) as string[]
  const fileUrls: Record<string, string> = {}
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from('dossiers').createSignedUrls(paths, 3600)
    ;(signed || []).forEach((s, i) => { if (s?.signedUrl && !s.error) fileUrls[paths[i]] = s.signedUrl })
  }
  for (const f of factures) if (f.fichier_url && /^https?:\/\//.test(f.fichier_url)) fileUrls[f.fichier_url] = f.fichier_url

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <ReceiptText className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-surface-900">Factures formateurs</h1>
          <p className="text-sm text-surface-500">Factures de prestation envoyées par les formateurs — à valider et mettre en paiement</p>
        </div>
      </div>

      <FacturesFormateursList factures={factures} fileUrls={fileUrls} />
    </div>
  )
}
