import type { NavSection } from '@/lib/types'

export const navigation: NavSection[] = [
  {
    title: 'Général',
    items: [
      { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { label: 'Vue Terrain', href: '/dashboard/commercial', icon: 'Presentation', module: 'leads', hideForRoles: ['apporteur_affaires'] },
      { label: 'Leads', href: '/dashboard/leads', icon: 'UserPlus', module: 'leads' },
      { label: 'Clients', href: '/dashboard/clients', icon: 'Building2', module: 'clients' },
      { label: 'Contacts', href: '/dashboard/contacts', icon: 'Users', module: 'contacts' },
      { label: 'Apporteurs', href: '/dashboard/apporteurs', icon: 'Handshake', module: 'apporteurs' },
      { label: 'Devis', href: '/dashboard/devis', icon: 'FileText', module: 'devis' },
    ],
  },
  {
    title: 'Outils',
    items: [
      { label: 'Agenda', href: '/dashboard/agenda', icon: 'CalendarDays', module: 'leads' },
      { label: 'Mailing', href: '/dashboard/mailing', icon: 'Mails', module: 'leads' },
      { label: 'Simulateur OPCO', href: '/dashboard/simulateur', icon: 'Calculator', module: 'leads' },
      { label: 'Audit Conformité', href: '/dashboard/audit', icon: 'ClipboardList', module: 'leads' },
      { label: 'Prospection Email', href: '/dashboard/prospection', icon: 'Send', module: 'leads' },
      { label: 'Vue Manager', href: '/dashboard/manager', icon: 'PieChart', module: 'reporting' },
    ],
  },
  {
    title: 'Formations',
    items: [
      { label: 'Catalogue', href: '/dashboard/formations', icon: 'GraduationCap', module: 'formations' },
      { label: 'Sessions', href: '/dashboard/sessions', icon: 'Calendar', module: 'sessions' },
      { label: 'Carte sessions', href: '/dashboard/carte-sessions', icon: 'MapPin', module: 'sessions' },
      { label: 'Apprenants', href: '/dashboard/apprenants', icon: 'UserCheck', module: 'apprenants' },
      { label: 'Formateurs', href: '/dashboard/formateurs', icon: 'Presentation', module: 'formateurs' },
    ],
  },
  {
    title: 'Administratif',
    items: [
      { label: 'Suivi Admin', href: '/dashboard/suivi-admin', icon: 'Layers', module: 'conventions' },
      { label: 'Dossiers', href: '/dashboard/dossiers', icon: 'FolderOpen', module: 'conventions' },
      { label: 'Conventions', href: '/dashboard/conventions', icon: 'FileSignature', module: 'conventions' },
      { label: 'Documents', href: '/dashboard/documents', icon: 'FolderOpen', module: 'documents' },
      { label: 'Signatures', href: '/dashboard/signatures', icon: 'PenTool', module: 'signatures' },
    ],
  },
  {
    title: 'Finances',
    items: [
      { label: 'Factures', href: '/dashboard/factures', icon: 'Receipt', module: 'factures' },
      { label: 'Paiements', href: '/dashboard/paiements', icon: 'CreditCard', module: 'paiements' },
    ],
  },
  {
    title: 'Qualité',
    items: [
      { label: 'Évaluations', href: '/dashboard/evaluations', icon: 'ClipboardCheck', module: 'evaluations' },
      { label: 'QCM', href: '/dashboard/qcm', icon: 'ListChecks', module: 'qcm' },
      { label: 'Qualiopi', href: '/dashboard/qualiopi', icon: 'ShieldCheck', module: 'qualiopi' },
      { label: 'Réclamations', href: '/dashboard/reclamations', icon: 'MessageSquareWarning', module: 'reclamations' },
    ],
  },
  {
    title: 'Système',
    items: [
      { label: 'Rapports', href: '/dashboard/reporting', icon: 'BarChart3', module: 'reporting' },
      { label: 'Portails', href: '/dashboard/portals', icon: 'Globe', module: 'users' },
      { label: 'Utilisateurs', href: '/dashboard/users', icon: 'Shield', module: 'users' },
      { label: 'Paramètres', href: '/dashboard/settings', icon: 'Settings', module: 'settings' },
    ],
  },
]
