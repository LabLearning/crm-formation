/**
 * Collecte des dossiers de qualification des formateurs (indicateur 21).
 *
 * Les CV, diplômes et habilitations ont été envoyés par les formateurs sur
 * sales@lab-learning.fr, en réponse aux demandes « Constitution de votre
 * dossier formateur ». Ils n'ont jamais été versés au CRM : au 12/08/2026,
 * aucun des 54 formateurs actifs n'a de CV consultable depuis sa fiche.
 *
 * Ce script relit ces fils de discussion et pousse chaque pièce jointe vers
 * le CRM, qui la range dans le dossier du formateur d'après l'adresse de
 * l'expéditeur. Le dépôt est idempotent : relancer ne crée pas de doublon.
 *
 * ── Mise en place ──────────────────────────────────────────────────────────
 * 1. script.google.com → Nouveau projet, connecté au compte sales@
 * 2. Coller ce fichier ENTIER dans Code.gs, puis remplacer SECRET par la
 *    valeur de CRON_SECRET (Vercel)
 * 3. Exécuter `collecter` une première fois → autoriser Gmail et les appels
 *    externes lorsque Google le demande
 * 4. Si l'exécution s'arrête au bout de 6 minutes (limite Google), relancer
 *    `collecter` : la reprise se fait toute seule là où elle s'était arrêtée
 * 5. Une fois « TERMINÉ » affiché dans le journal, plus rien à faire
 */

var CRM = 'https://crm.lab-learning.fr/api/ingest/piece'
var SECRET = 'REMPLACER_PAR_LE_CRON_SECRET'

// Les fils dans lesquels les formateurs ont répondu avec leur dossier. On
// cible les objets plutôt que « has:attachment » : le second ramène des
// milliers de factures et d'accords OPCO sans rapport.
var REQUETES = [
  'subject:("dossier formateur") has:attachment',
  'subject:("contrat de sous-traitance") has:attachment',
  'subject:("contrat de sous traitance") has:attachment',
  'subject:("documents pour mission") has:attachment',
  'subject:("exigences Qualiopi") has:attachment',
  'has:attachment (filename:cv OR "curriculum vitae")',
]

// Les images de signature de mail arrivent en pièce jointe comme les autres et
// noieraient les vrais documents. Le nom suffit à les écarter.
var IGNORER = /^(image\d{3,}|logo|signature|unnamed|outlook-)/i
var EXTENSIONS = /\.(pdf|jpe?g|png|heic|docx?|odt)$/i
var TAILLE_MAX = 25 * 1024 * 1024

function extraireEmail(from) {
  var m = String(from).match(/<([^>]+)>/)
  return (m ? m[1] : String(from)).trim().toLowerCase()
}

function pousser(pj, nom, expediteur, msg) {
  var charge = {
    fichier: pj.copyBlob().setName(nom),
    formateur_email: expediteur,
    type: 'auto',
    origine: 'mail',
    date_piece: Utilities.formatDate(msg.getDate(), 'Europe/Paris', 'yyyy-MM-dd'),
    objet: msg.getSubject(),
    description: 'Transmis par ' + expediteur + ' le '
      + Utilities.formatDate(msg.getDate(), 'Europe/Paris', 'dd/MM/yyyy'),
  }
  try {
    var rep = UrlFetchApp.fetch(CRM, {
      method: 'post',
      payload: charge,
      headers: { Authorization: 'Bearer ' + SECRET },
      muteHttpExceptions: true,
    })
    var code = rep.getResponseCode()
    if (code === 200) return true
    // 404 = expéditeur inconnu du CRM. C'est une information utile, pas une
    // erreur : ce sont les formateurs à créer, ou dont l'email a changé.
    Logger.log('[' + code + '] ' + expediteur + ' — ' + nom + ' : ' + rep.getContentText().slice(0, 160))
    return false
  } catch (e) {
    Logger.log('ÉCHEC ' + nom + ' : ' + e)
    return false
  }
}

function collecter() {
  var props = PropertiesService.getScriptProperties()
  var debut = new Date().getTime()
  var iRequete = Number(props.getProperty('req') || 0)
  var iFil = Number(props.getProperty('fil') || 0)
  var deposes = Number(props.getProperty('ok') || 0)
  var ignores = Number(props.getProperty('ko') || 0)

  for (; iRequete < REQUETES.length; iRequete++) {
    var fils = GmailApp.search(REQUETES[iRequete], 0, 200)
    for (; iFil < fils.length; iFil++) {
      // Google coupe l'exécution à 6 minutes : on s'arrête avant et on note où.
      if (new Date().getTime() - debut > 4.5 * 60 * 1000) {
        props.setProperties({ req: String(iRequete), fil: String(iFil), ok: String(deposes), ko: String(ignores) })
        Logger.log('PAUSE — relancer `collecter` pour continuer. Déposés : ' + deposes)
        return
      }

      var messages = fils[iFil].getMessages()
      for (var m = 0; m < messages.length; m++) {
        var msg = messages[m]
        var expediteur = extraireEmail(msg.getFrom())
        // Un message que NOUS avons envoyé porte nos propres pièces jointes :
        // ce n'est pas le dossier du formateur.
        if (expediteur.indexOf('lab-learning.fr') !== -1) continue

        var pjs = msg.getAttachments({ includeInlineImages: false, includeAttachments: true })
        for (var a = 0; a < pjs.length; a++) {
          var pj = pjs[a]
          var nom = pj.getName()
          if (IGNORER.test(nom) || !EXTENSIONS.test(nom) || pj.getSize() > TAILLE_MAX) { ignores++; continue }

          var res = pousser(pj, nom, expediteur, msg)
          if (res) { deposes++ } else { ignores++ }
        }
      }
    }
    iFil = 0
  }

  props.deleteAllProperties()
  Logger.log('TERMINÉ — ' + deposes + ' pièce(s) déposée(s), ' + ignores + ' ignorée(s).')
}

/** À lancer si l'on veut repartir de zéro plutôt que reprendre. */
function reinitialiser() {
  PropertiesService.getScriptProperties().deleteAllProperties()
  Logger.log('Reprise remise à zéro.')
}
