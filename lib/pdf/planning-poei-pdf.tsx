import * as React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { PdfDocHeader, PdfDocFooter, shared, BRAND_GREEN, BRAND_ULTRA_LIGHT, SURFACE_100, SURFACE_500, SURFACE_700, SURFACE_900 } from './components'

export interface JourPlanning {
  date: string          // AAAA-MM-JJ
  repos: boolean
  creneau1_debut?: string | null
  creneau1_fin?: string | null
  creneau2_debut?: string | null
  creneau2_fin?: string | null
  note?: string | null
}

interface PlanningPoeiProps {
  org: any
  poei: { numero?: string | null; poste_vise?: string | null; numero_dossier_ft?: string | null }
  employeur?: string | null
  candidatNom: string
  identifiantFt?: string | null
  jours: JourPlanning[]
}

const JOURS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const hm = (t?: string | null) => (t ? t.slice(0, 5) : '')
const minutes = (t?: string | null) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
const dureeJour = (j: JourPlanning) => (j.repos ? 0 :
  Math.max(0, minutes(j.creneau1_fin) - minutes(j.creneau1_debut)) +
  Math.max(0, minutes(j.creneau2_fin) - minutes(j.creneau2_debut)))
const heures = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}
const frDate = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
const frDateLongue = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Regroupe les jours par semaine civile (lundi → dimanche). */
function parSemaine(jours: JourPlanning[]): JourPlanning[][] {
  const tri = [...jours].sort((a, b) => a.date.localeCompare(b.date))
  const semaines: JourPlanning[][] = []
  let courante: JourPlanning[] = []
  for (const j of tri) {
    const dow = new Date(j.date + 'T12:00:00Z').getUTCDay() // 0 = dimanche
    if (dow === 1 && courante.length) { semaines.push(courante); courante = [] }
    courante.push(j)
  }
  if (courante.length) semaines.push(courante)
  return semaines
}

export function PlanningPoeiPDF({ org, poei, employeur, candidatNom, identifiantFt, jours }: PlanningPoeiProps) {
  const semaines = parSemaine(jours)
  const totalMin = jours.reduce((s, j) => s + dureeJour(j), 0)
  const debut = jours.length ? jours.reduce((a, b) => (a.date < b.date ? a : b)).date : null
  const fin = jours.length ? jours.reduce((a, b) => (a.date > b.date ? a : b)).date : null

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        <PdfDocHeader docTitle="Planning de travail" numero={poei.numero || ''} org={org} />

        <View style={shared.infoBox}>
          <Text style={{ fontSize: 11, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, marginBottom: 3 }}>{candidatNom}</Text>
          {identifiantFt ? <Text style={shared.infoBoxText}>{`Identifiant France Travail : ${identifiantFt}`}</Text> : null}
          {poei.poste_vise ? <Text style={shared.infoBoxText}>{`Poste visé : ${poei.poste_vise}`}</Text> : null}
          {employeur ? <Text style={shared.infoBoxText}>{`Établissement : ${employeur}`}</Text> : null}
          {debut && fin ? <Text style={shared.infoBoxText}>{`Période : du ${frDateLongue(debut)} au ${frDateLongue(fin)} — ${heures(totalMin)} planifiées`}</Text> : null}
        </View>

        {semaines.map((sem, i) => {
          const totalSem = sem.reduce((s, j) => s + dureeJour(j), 0)
          return (
            <View key={i} wrap={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN }}>
                  {`Semaine du ${frDateLongue(sem[0].date)}`}
                </Text>
                <Text style={{ fontSize: 9, color: SURFACE_500 }}>{heures(totalSem)}</Text>
              </View>
              <View style={{ borderWidth: 1, borderColor: SURFACE_100, borderRadius: 6, overflow: 'hidden' }}>
                {sem.map((j, k) => {
                  const dow = new Date(j.date + 'T12:00:00Z').getUTCDay()
                  const nomJour = JOURS_FR[(dow + 6) % 7]
                  const c1 = j.creneau1_debut && j.creneau1_fin ? `${hm(j.creneau1_debut)} - ${hm(j.creneau1_fin)}` : ''
                  const c2 = j.creneau2_debut && j.creneau2_fin ? `${hm(j.creneau2_debut)} - ${hm(j.creneau2_fin)}` : ''
                  return (
                    <View key={j.date} style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8,
                      backgroundColor: j.repos ? BRAND_ULTRA_LIGHT : (k % 2 ? '#FFFFFF' : '#FBFCFD'),
                      borderTopWidth: k === 0 ? 0 : 1, borderTopColor: SURFACE_100,
                    }}>
                      <Text style={{ fontSize: 9, fontFamily: 'Satoshi', fontWeight: 700, color: SURFACE_900, width: 80 }}>{nomJour}</Text>
                      <Text style={{ fontSize: 9, color: SURFACE_500, width: 45 }}>{frDate(j.date)}</Text>
                      {j.repos ? (
                        <Text style={{ fontSize: 9, fontFamily: 'Satoshi', fontWeight: 700, color: BRAND_GREEN }}>Repos</Text>
                      ) : (
                        <>
                          <Text style={{ fontSize: 9, color: SURFACE_700, width: 110 }}>{c1}</Text>
                          <Text style={{ fontSize: 9, color: SURFACE_700, width: 110 }}>{c2}</Text>
                          <Text style={{ fontSize: 9, color: SURFACE_500, marginLeft: 'auto' }}>{heures(dureeJour(j))}</Text>
                        </>
                      )}
                      {j.note ? <Text style={{ fontSize: 8, color: SURFACE_500, marginLeft: 8 }}>{j.note}</Text> : null}
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}

        <View style={{ marginTop: 14, padding: 8, backgroundColor: BRAND_ULTRA_LIGHT, borderRadius: 6 }}>
          <Text style={{ fontSize: 9, color: SURFACE_700 }}>
            {`Total planifié sur la période : ${heures(totalMin)}. Ce planning est remis à titre indicatif et peut être ajusté par l'établissement dans le respect des durées légales de travail et de repos.`}
          </Text>
        </View>

        <PdfDocFooter numero={poei.numero || ''} org={org} />
      </Page>
    </Document>
  )
}
