import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiSquare,
  FiHome,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronRight,
} from 'react-icons/fi'
import { useUser } from '../../context/useUser'
import ThemeToggle from '../ThemeToggle'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: FiHome },
  { label: 'Profile', path: '/profile/edit', icon: FiUser },
]

const AppShell = ({ children, title, subtitle, compactHeader = false }) => {
  const { user, logout } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = (user?.name || 'G').slice(0, 2).toUpperCase()

  const SidebarContent = () => (
    <div className="flex h-full flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 px-6 pb-8 pt-10">
        <FiSquare className="text-black dark:text-white" size={24} strokeWidth={2.5} />
        <span className="text-sm font-bold tracking-widest uppercase text-black dark:text-white">
          PrepAI
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                isActive
                  ? 'text-black dark:text-white'
                  : 'text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon size={16} />
              {item.label}
              {isActive && (
                <div className="ml-auto h-1 w-1 bg-black dark:bg-white" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 pb-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center border border-neutral-200 dark:border-neutral-800 text-[10px] font-bold text-black dark:text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-black dark:text-white">
              {user?.name || 'Guest'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 border border-black dark:border-white bg-white dark:bg-neutral-950 py-2 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white transition hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
        >
          <FiLogOut size={12} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-6 py-4 lg:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid h-10 w-10 place-items-center border border-neutral-200 dark:border-neutral-800 text-black dark:text-white lg:hidden"
              >
                {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
              </button>

              <div>
                <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-black dark:text-white">
                  {title}
                </h1>
                {!compactHeader && subtitle && (
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden h-4 w-px bg-neutral-200 dark:bg-neutral-800 sm:block" />
              <div className="hidden text-[11px] font-bold uppercase tracking-wider text-black dark:text-white sm:block">
                {user?.name || 'Guest'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-10 lg:px-10">{children}</main>
      </div>
    </div>
  )
}

export default AppShell
