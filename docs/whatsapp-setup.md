# Activation WhatsApp (Meta Cloud API)

Le canal WhatsApp est **construit et prêt** dans le CRM. Tant que les credentials Meta
ne sont pas configurés, il tourne en **mode DEV** : les messages sont journalisés
(table `whatsapp_logs`, status `dev`) sans être envoyés — aucun flux email n'est impacté.

## Étapes côté Meta (à faire une fois)

1. **Meta Business Manager** → créer/vérifier l'entreprise Lab Learning.
2. **WhatsApp Business Platform** → ajouter un **numéro Business dédié** (différent d'un WhatsApp perso).
3. Récupérer le **Phone Number ID** et générer un **token permanent** (System User).
4. **Créer les templates** (Message Templates) et les faire approuver (~24-48 h) :

### Template `convocation_j3` (catégorie : Utility, langue : fr)
Corps avec 4 variables positionnelles :
```
Bonjour {{1}}, votre formation "{{2}}" débute le {{3}} à {{4}}.
À bientôt — Lab Learning.
```
- {{1}} = prénom · {{2}} = formation · {{3}} = date · {{4}} = lieu

(D'autres templates pourront être ajoutés au fil des rappels : satisfaction, relance…)

## Étapes côté CRM

Renseigner les variables d'environnement (Vercel → Settings → Environment Variables) :
```
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_API_VERSION=v21.0
```
Dès qu'elles sont présentes, l'envoi réel s'active automatiquement.

## Consentement (obligatoire Meta + RGPD)
Chaque client/apprenant doit avoir **opt-in** : sur la fiche client, renseigner le
**numéro WhatsApp** + cocher **« Accepte les rappels par WhatsApp »**. Sans opt-in,
aucun message n'est envoyé à ce contact.

## Ce qui est déjà branché
- **Cron J-3 convocations** (`/api/cron/convocations`) : envoie le template `convocation_j3`
  aux apprenants opt-in, en plus de la notification in-app/email.

Pour ajouter WhatsApp à d'autres rappels : appeler `sendWhatsAppTemplate(...)` de
`lib/whatsapp.ts` avec le nom du template approuvé correspondant.
