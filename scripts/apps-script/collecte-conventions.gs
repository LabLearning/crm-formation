/**
 * Collecte ciblée des CONVENTIONS (signées) dans la boîte sales@.
 *
 * Les conventions des sessions récentes (2026) ne sont ni dans l'archive
 * Drive (arrêtée à janvier) ni toutes dans les remises Bibby : les clients
 * les retournent signées par mail. Ce script balaye tous les mails — reçus
 * ET envoyés — portant une convention en pièce jointe et les pousse vers
 * l'API du CRM, qui les type et les rattache (client nommé dans le fichier
 * ou l'objet + date du mail + session à qui il manque la pièce).
 * Idempotent : relancer ne crée aucun doublon.
 *
 * ── Mise en place ──────────────────────────────────────────────────────────
 * script.google.com (compte sales@) → nouveau projet → coller ce fichier →
 * lancer `collecter` → relancer à chaque PAUSE jusqu'à TERMINÉ.
 */

var CRM = 'https://crm.lab-learning.fr/api/ingest/piece'
var SECRET = 'REMPLACER_PAR_LE_CRON_SECRET'

// Conventions et avenants depuis janvier 2026 (l'archive Drive couvre avant),
// reçus comme envoyés.
var REQUETES = [
  'has:attachment filename:convention after:2026/01/01',
  'has:attachment filename:avenant after:2026/01/01',
  'has:attachment subject:convention after:2026/01/01',
  'has:attachment subject:(convention signée) after:2026/01/01',
]

var IGNORER = /^(image\d{3,}|logo|signature|unnamed|outlook-)/i
var EXTENSIONS = /\.(pdf|jpe?g|png|heic)$/i
var TAILLE_MAX = 25 * 1024 * 1024
// Nos modèles vierges sortants s'appellent exactement « CONVENTION DE
// FORMATION PROFESSIONNELLE.pdf » : jamais des signées.
var VIERGES = /^convention de formation professionnelle( \(.*\))?\.pdf$/i

function pousser(pj, nom, msg) {
  var blob
  try {
    blob = Utilities.newBlob(pj.getBytes(), pj.getContentType() || 'application/pdf', nom)
  } catch (e) {
    Logger.log('PIÈCE ILLISIBLE ' + nom + ' : ' + e)
    return false
  }
  var charge = {
    fichier: blob,
    type: 'convention_signee',
    origine: 'mail_convention',
    date_piece: Utilities.formatDate(msg.getDate(), 'Europe/Paris', 'yyyy-MM-dd'),
    objet: msg.getSubject(),
    date_mail: Utilities.formatDate(msg.getDate(), 'Europe/Paris', 'yyyy-MM-dd'),
    description: 'Convention reçue/envoyée par mail (' + msg.getSubject().slice(0, 60) + ') du '
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
        Logger.log('PAUSE — relancer `collecter`. Déposées : ' + deposes)
        return
      }
      var messages = fils[iFil].getMessages()
      for (var m = 0; m < messages.length; m++) {
        var msg = messages[m]
        var pjs
        try {
          pjs = msg.getAttachments({ includeInlineImages: false, includeAttachments: true })
        } catch (e) { pjs = msg.getAttachments() }
        for (var a = 0; a < (pjs || []).length; a++) {
          var pj = pjs[a]
          if (!pj) { ignores++; continue }
          var nom = pj.getName() || ('piece-' + a + '.pdf')
          if (IGNORER.test(nom) || !EXTENSIONS.test(nom) || VIERGES.test(nom) || pj.getSize() > TAILLE_MAX) { ignores++; continue }
          // On ne pousse que ce qui ressemble à une convention/avenant :
          // les autres pièces du même mail (factures, CNI…) restent en place.
          if (!/convention|avenant/i.test(nom) && !/convention/i.test(msg.getSubject())) { ignores++; continue }
          if (pousser(pj, nom, msg)) { deposes++ } else { ignores++ }
        }
      }
    }
    iFil = 0
  }
  props.deleteAllProperties()
  Logger.log('TERMINÉ — ' + deposes + ' déposée(s), ' + ignores + ' ignorée(s)/à rattacher à la main.')
}

function reinitialiser() {
  PropertiesService.getScriptProperties().deleteAllProperties()
  Logger.log('Reprise remise à zéro.')
}
