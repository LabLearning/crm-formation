import type { Permission, UserRole, CRMModule } from '@/lib/types'

type Action = 'create' | 'read' | 'update' | 'delete'

export function hasPermission(
  permissions: Permission[],
  module: CRMModule,
  action: Action
): boolean {
  const perm = permissions.find((p) => p.module === module)
  if (!perm) return false

  switch (action) {
    case 'create': return perm.can_create
    case 'read': return perm.can_read
    case 'update': return perm.can_update
    case 'delete': return perm.can_delete
    default: return false
  }
}

export function hasAnyPermission(
  permissions: Permission[],
  module: CRMModule
): boolean {
  const perm = permissions.find((p) => p.module === module)
  if (!perm) return false
  return perm.can_create || perm.can_read || perm.can_update || perm.can_delete
}

export function isAdmin(role: UserRole): boolean {
  return role === 'super_admin' || role === 'gestionnaire'
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin'
}

// Liste des modules visibles dans la navigation pour un rôle donné
export function getVisibleModules(
  permissions: Permission[]
): CRMModule[] {
  return permissions
    .filter((p) => p.can_read || p.can_create)
    .map((p) => p.module as CRMModule)
}
