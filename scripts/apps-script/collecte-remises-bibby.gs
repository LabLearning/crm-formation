/**
 * Collecte des pièces justificatives des remises Bibby Factor (ind. 12 & co).
 *
 * Chaque remise envoyée depuis sales@ à Bibby (« REMISE EXPRESS … ») porte en
 * pièces jointes les justificatifs des factures : conventions SIGNÉES,
 * certificats de réalisation, feuilles d'émargement, accords de prise en
 * charge, factures. Beaucoup n'ont jamais été versés au CRM.
 *
 * Ce script relit les mails ENVOYÉS à Bibby et pousse chaque pièce jointe
 * vers l'API du CRM, qui la type d'après son nom (convention → convention
 * signée…) et la rattache à sa session : n° de dossier AKTO trouvé dans le
 * nom du fichier (2411AF033920 → certain), sinon client + date du mail.
 * Idempotent : relancer ne crée aucun doublon.
 *
 * ── Mise en place ──────────────────────────────────────────────────────────
 * 1. script.google.com → Nouveau projet, connecté au compte sales@
 * 2. Coller ce fichier ENTIER dans Code.gs, remplacer SECRET par la valeur
 *    de CRON_SECRET (Vercel)
 * 3. Exécuter `collecter` → autoriser Gmail et les appels externes
 * 4. Si l'exécution s'arrête à 6 minutes (limite Google), relancer
 *    `collecter` : la reprise se fait toute seule
 * 5. « TERMINÉ » dans le journal = tout est déposé
 */

var CRM = 'https://crm.lab-learning.fr/api/ingest/piece'
var SECRET = 'REMPLACER_PAR_LE_CRON_SECRET'

// Tous les envois vers Bibby : remises express/standard et compléments de
// pièces envoyés en réponse (Re:). Le tri se fait ensuite par pièce.
var REQUETES = [
  'in:sent to:bibbyremises@bibbyfactor.fr has:attachment',
  'in:sent to:SHELEL@bibbyfactor.fr has:attachment',
  'in:sent to:VRONCHARD@bibbyfactor.fr has:attachment',
]

var IGNORER = /^(image\d{3,}|logo|signature|unnamed|outlook-)/i
var EXTENSIONS = /\.(pdf|jpe?g|png|heic|docx?|odt|xlsx?)$/i
var TAILLE_MAX = 25 * 1024 * 1024

function pousser(pj, nom, msg) {
  var charge = {
    fichier: pj.copyBlob().setName(nom),
    type: 'auto',
    origine: 'remise_bibby',
    date_piece: Utilities.formatDate(msg.getDate(), 'Europe/Paris', 'yyyy-MM-dd'),
    objet: msg.getSubject(),
    date_mail: Utilities.formatDate(msg.getDate(), 'Europe/Paris', 'yyyy-MM-dd'),
    description: 'Pièce justificative de remise Bibby (' + msg.getSubject().slice(0, 60) + ') du '
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
    // 404 = session introuvable : pièce à rattacher à la main, le journal
    // garde la trace (nom + remise).
    Logger.log('[' + code + '] ' + nom + ' (' + msg.getSubject().slice(0, 50) + ') : ' + rep.getContentText().slice(0, 140))
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
    var fils = GmailApp.search(REQUETES[iRequete], 0, 400)
    for (; iFil < fils.length; iFil++) {
      if (new Date().getTime() - debut > 4.5 * 60 * 1000) {
        props.setProperties({ req: String(iRequete), fil: String(iFil), ok: String(deposes), ko: String(ignores) })
        Logger.log('PAUSE — relancer `collecter` pour continuer. Déposées : ' + deposes)
        return
      }

      var messages = fils[iFil].getMessages()
      for (var m = 0; m < messages.length; m++) {
        var msg = messages[m]
        // Seuls NOS envois portent les justificatifs ; les réponses de Bibby
        // contiennent leurs propres pièces (relevés, listings) sans intérêt.
        var de = String(msg.getFrom()).toLowerCase()
        if (de.indexOf('lab-learning.fr') === -1) continue

        var pjs = msg.getAttachments({ includeInlineImages: false, includeAttachments: true })
        for (var a = 0; a < pjs.length; a++) {
          var pj = pjs[a]
          var nom = pj.getName()
          if (IGNORER.test(nom) || !EXTENSIONS.test(nom) || pj.getSize() > TAILLE_MAX) { ignores++; continue }
          var res = pousser(pj, nom, msg)
          if (res) { deposes++ } else { ignores++ }
        }
      }
    }
    iFil = 0
  }

  props.deleteAllProperties()
  Logger.log('TERMINÉ — ' + deposes + ' pièce(s) déposée(s), ' + ignores + ' ignorée(s) ou à rattacher à la main.')
}

/** À lancer pour repartir de zéro plutôt que reprendre. */
function reinitialiser() {
  PropertiesService.getScriptProperties().deleteAllProperties()
  Logger.log('Reprise remise à zéro.')
}
