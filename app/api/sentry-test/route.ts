// Endpoint test Sentry — déclenche une exception pour vérifier la capture
// À supprimer une fois Sentry validé en prod
export async function GET() {
  throw new Error('Sentry test — capture serveur OK ?')
}
