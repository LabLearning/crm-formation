const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface AIResponse {
  success: boolean
  content: string
  error?: string
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { success: false, content: '', error: 'Clé API Anthropic non configurée' }
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return { success: false, content: '', error: err.error?.message || 'Erreur API Claude' }
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    return { success: true, content: text }
  } catch (err) {
    return { success: false, content: '', error: 'Erreur réseau' }
  }
}

// ── Génération de QCM ─────────────────────────────────────

interface GeneratedQuestion {
  question: string
  reponses: { texte: string; est_correcte: boolean }[]
  explication: string
}

export async function generateQCMQuestions(params: {
  formationTitle: string
  theme: string
  niveau: 'debutant' | 'intermediaire' | 'avance'
  nbQuestions: number
}): Promise<{ success: boolean; questions: GeneratedQuestion[]; error?: string }> {
  const systemPrompt = `Tu es un expert en ingénierie pédagogique pour la formation professionnelle dans les métiers de la restauration, boucherie, boulangerie, pâtisserie et hôtellerie. Tu génères des QCM de qualité professionnelle conformes aux exigences Qualiopi.

Règles strictes :
- Chaque question a exactement 4 réponses possibles
- Une seule réponse correcte par question
- Les questions doivent être claires, précises et professionnelles
- Les mauvaises réponses doivent être plausibles
- Chaque question a une explication pédagogique
- Le contenu doit être factuel et conforme à la réglementation française
- Réponds UNIQUEMENT en JSON valide, sans texte avant ou après`

  const userPrompt = `Génère ${params.nbQuestions} questions QCM pour la formation "${params.formationTitle}" sur le thème "${params.theme}".
Niveau : ${params.niveau}

Réponds en JSON avec ce format exact :
[
  {
    "question": "La question ici ?",
    "reponses": [
      {"texte": "Réponse A", "est_correcte": false},
      {"texte": "Réponse B", "est_correcte": true},
      {"texte": "Réponse C", "est_correcte": false},
      {"texte": "Réponse D", "est_correcte": false}
    ],
    "explication": "Explication de la bonne réponse"
  }
]`

  const result = await callClaude(systemPrompt, userPrompt)
  if (!result.success) {
    return { success: false, questions: [], error: result.error }
  }

  try {
    // Extraire le JSON du contenu (au cas où il y a du texte autour)
    const jsonMatch = result.content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { success: false, questions: [], error: 'Réponse IA invalide' }
    }
    const questions = JSON.parse(jsonMatch[0]) as GeneratedQuestion[]
    return { success: true, questions }
  } catch {
    return { success: false, questions: [], error: 'Erreur de parsing JSON' }
  }
}

// ── Génération de programme de formation ───────────────────

interface ProgrammeModule {
  titre: string
  duree: string
  objectifs: string[]
  contenu: string[]
}

interface GeneratedProgramme {
  objectif_general: string
  public_cible: string
  prerequis: string
  modules: ProgrammeModule[]
  modalites_evaluation: string[]
  moyens_pedagogiques: string[]
}

export async function generateProgrammeFormation(params: {
  intitule: string
  categorie: string
  duree_heures: number
  modalite: string
}): Promise<{ success: boolean; programme: GeneratedProgramme | null; error?: string }> {
  const systemPrompt = `Tu es un ingénieur pédagogique expert en formation professionnelle dans les métiers de bouche (restauration, boucherie, boulangerie, pâtisserie, hôtellerie). Tu crées des programmes de formation conformes aux exigences Qualiopi et aux référentiels métier.

Règles :
- Programme structuré en modules avec durées, objectifs et contenu détaillé
- Conforme à la réglementation française (HACCP, hygiène, sécurité)
- Objectifs pédagogiques formulés avec des verbes d'action (être capable de...)
- Modalités d'évaluation variées (QCM, mise en situation, exercices pratiques)
- Adapté à la durée totale indiquée
- Réponds UNIQUEMENT en JSON valide`

  const userPrompt = `Génère un programme de formation complet pour :
- Intitulé : "${params.intitule}"
- Catégorie : ${params.categorie}
- Durée : ${params.duree_heures} heures
- Modalité : ${params.modalite}

Réponds en JSON avec ce format exact :
{
  "objectif_general": "L'objectif général de la formation",
  "public_cible": "Description du public visé",
  "prerequis": "Les prérequis nécessaires",
  "modules": [
    {
      "titre": "Module 1 : Titre",
      "duree": "3h",
      "objectifs": ["Objectif 1", "Objectif 2"],
      "contenu": ["Point 1", "Point 2", "Point 3"]
    }
  ],
  "modalites_evaluation": ["QCM de validation", "Mise en situation pratique"],
  "moyens_pedagogiques": ["Support de cours", "Exercices pratiques"]
}`

  const result = await callClaude(systemPrompt, userPrompt)
  if (!result.success) {
    return { success: false, programme: null, error: result.error }
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, programme: null, error: 'Réponse IA invalide' }
    }
    const programme = JSON.parse(jsonMatch[0]) as GeneratedProgramme
    return { success: true, programme }
  } catch {
    return { success: false, programme: null, error: 'Erreur de parsing JSON' }
  }
}
