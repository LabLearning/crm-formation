import type { Metadata, Viewport } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Mon espace — Lab Learning',
  description: 'Espace personnel apprenant, formateur, client et apporteur Lab Learning',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lab Learning',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#195144',
}

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
