'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, LogOut, Settings, User as UserIcon, Menu, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { NotificationsBell } from './NotificationsBell'
import { ROLE_LABELS } from '@/lib/types'
import type { User } from '@/lib/types'

interface HeaderProps {
  user: User
  onMobileMenuToggle: () => void
}

export function Header({ user, onMobileMenuToggle }: HeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-[60px] bg-white/80 backdrop-blur-xl border-b border-surface-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-surface-400 hover:bg-surface-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2.5 bg-surface-50 rounded-xl px-3.5 py-2 w-72 border border-surface-200/60 hover:border-surface-300 transition-colors">
          <Search className="h-3.5 w-3.5 text-surface-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none flex-1"
          />
          <kbd className="hidden sm:inline-flex text-[10px] text-surface-400 bg-white border border-surface-200 rounded-md px-1.5 py-0.5 font-mono leading-none">
            /
          </kbd>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <NotificationsBell userId={user.id} />

        {/* Separator */}
        <div className="h-6 w-px bg-surface-200 mx-1.5 hidden sm:block" />

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface-50 transition-colors"
          >
            <Avatar firstName={user.first_name} lastName={user.last_name} src={user.avatar_url} size="sm" />
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-surface-800 leading-none">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-[11px] text-surface-400 mt-0.5">{ROLE_LABELS[user.role]}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-surface-400 hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-surface-200 shadow-elevated py-1 animate-in-scale origin-top-right">
              <div className="px-3.5 py-2.5 border-b border-surface-100">
                <div className="text-sm font-medium text-surface-900">{user.first_name} {user.last_name}</div>
                <div className="text-xs text-surface-400 truncate mt-0.5">{user.email}</div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { router.push('/dashboard/settings'); setMenuOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-surface-600 hover:bg-surface-50 hover:text-surface-800 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Paramètres
                </button>
                <button
                  onClick={() => { router.push('/dashboard/profile'); setMenuOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-surface-600 hover:bg-surface-50 hover:text-surface-800 transition-colors"
                >
                  <UserIcon className="h-4 w-4" />
                  Mon profil
                </button>
              </div>

              <div className="border-t border-surface-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
