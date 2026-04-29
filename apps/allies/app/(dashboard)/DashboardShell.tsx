'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Trophy,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'

const navLinks = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/sales', label: 'Sales', icon: ShoppingBag },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function SidebarContent({
  onClose,
  onThemeToggle,
  isDark,
}: {
  onClose?: () => void
  onThemeToggle: () => void
  isDark: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { ally } = useAlly()

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
        <Image src="/allies_logo.png" alt="Allies" width={80} height={20} className="invert" />
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white transition-colors md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Ally Profile */}
      {ally && (
        <div className="px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black text-xs font-semibold shrink-0">
              {initials(ally.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-neutral-100">
                {ally.full_name}
              </p>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-400 truncate">
                {ally.location}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3">
        {navLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.path)
          return (
            <Link
              key={link.path}
              href={link.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 text-xs tracking-[0.1em] uppercase transition-colors rounded-md mb-0.5 ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-neutral-800 space-y-1">
        <button
          onClick={onThemeToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs tracking-[0.1em] uppercase text-neutral-400 hover:text-white hover:bg-white/5 transition-colors rounded-md"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs tracking-[0.1em] uppercase text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-colors rounded-md"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-neutral-800">
        <p className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 leading-relaxed">
          Faith-inspired streetwear
        </p>
      </div>
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (dark: boolean) => {
      setIsDark(dark)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function toggleTheme() {
    setIsDark((d) => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-neutral-800 bg-black overflow-y-auto">
        <SidebarContent onThemeToggle={toggleTheme} isDark={isDark} />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-black flex flex-col md:hidden overflow-y-auto"
            >
              <SidebarContent
                onClose={() => setMobileOpen(false)}
                onThemeToggle={toggleTheme}
                isDark={isDark}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Pane */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-neutral-600 dark:text-neutral-400"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Image src="/allies_logo.png" alt="Allies" width={60} height={16} className="dark:invert" />
          <div className="w-9" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
