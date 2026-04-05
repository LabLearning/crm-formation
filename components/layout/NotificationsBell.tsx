'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDateTime } from '@/lib/utils'

interface Notification {
  id: string
  titre: string
  message: string
  type: string
  lien_url: string | null
  lien_label: string | null
  is_read: boolean
  created_at: string
}

const typeColors: Record<string, string> = {
  info: 'bg-brand-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  action: 'bg-purple-500',
}

export function NotificationsBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data as Notification[])
      setUnreadCount(data.filter((n) => !n.is_read).length)
    }
  }, [userId])

  // Initial fetch + Supabase Realtime subscription
  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20))
          setUnreadCount((c) => c + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          )
          setUnreadCount((prev) => {
            // Recount from state since we can't easily diff here
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function markAsRead(id: string) {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount((c) => Math.max(c - 1, 0))
  }

  async function markAllRead() {
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-surface-500 hover:bg-surface-50 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-danger-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-surface-200 shadow-modal z-50 animate-scale-in origin-top-right overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" /> Tout marquer comme lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={cn(
                    'px-4 py-3 border-b border-surface-100 last:border-0 cursor-pointer transition-colors',
                    !n.is_read ? 'bg-brand-50/30 hover:bg-brand-50/50' : 'hover:bg-surface-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('shrink-0 mt-1 h-2 w-2 rounded-full', !n.is_read ? (typeColors[n.type] || typeColors.info) : 'bg-transparent')} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-surface-800">{n.titre}</div>
                      <div className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-2xs text-surface-400">{formatDateTime(n.created_at)}</span>
                        {n.lien_url && (
                          <a href={n.lien_url} className="text-2xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                            {n.lien_label || 'Voir'} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-surface-400">
                Aucune notification
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
