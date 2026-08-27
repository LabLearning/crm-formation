import { readFileSync, writeFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
import { PDFDocument } from 'pdf-lib'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: d } = await sb.from('dossiers_agefice')
    .select(`*, client:client_id(raison_sociale, nom_commercial, code_naf, siret, secteur_activite, forme_juridique, adresse, code_postal, ville),
      apprenant:apprenant_id(civilite, prenom, nom, date_naissance, numero_securite_sociale, telephone, email),
      formation:formation_id(intitule, categorie),
      session:session_id(date_debut, date_fin, adresse, code_postal, ville, formateur:formateurs(prenom, nom))`)
    .limit(1).single()
  console.log('dossier:', d.client?.raison_sociale, '|', d.apprenant?.nom, '| naf:', d.client?.code_naf, '| fj:', d.client?.forme_juridique)
  const doc = await PDFDocument.load(readFileSync('public/gabarits/agefice-demande-pec.pdf'))
  const form = doc.getForm()
  form.getTextField('Nom (Stagiaire)').setText(d.apprenant?.nom || '')
  form.getTextField("Nom / Raison Sociale de L'entreprise (Entreprise)").setText(d.client?.raison_sociale || '')
  console.log('remplissage direct OK — la route fera le reste')
}
main()
