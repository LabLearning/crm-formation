'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#FAFAFA' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1C1917', marginBottom: '0.5rem' }}>Une erreur est survenue</h2>
            <p style={{ fontSize: '0.875rem', color: '#78716C', marginBottom: '1.5rem' }}>{error.message || 'Erreur inattendue'}</p>
            <button onClick={() => reset()}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '0.75rem', background: '#1C1917', color: '#fff', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              Reessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
