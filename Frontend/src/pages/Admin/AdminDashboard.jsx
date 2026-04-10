import { motion } from 'framer-motion'
import { FiShield, FiUsers, FiActivity, FiSettings, FiSquare } from 'react-icons/fi'
import AppShell from '../../components/layout/AppShell'

const ADMIN_CARDS = [
  {
    title: 'User Management',
    desc: 'Moderate authorized identities and system roles.',
    icon: FiUsers,
    status: 'SYSTEM_STABLE',
  },
  {
    title: 'Analytics Log',
    desc: 'Track global synchronized query metrics across nodes.',
    icon: FiActivity,
    status: 'DATA_COLLECTING',
  },
  {
    title: 'Core Configuration',
    desc: 'Modify intelligence engine parameters and system limits.',
    icon: FiSettings,
    status: 'LOCKED',
  },
]

const AdminDashboard = () => {
  return (
    <AppShell title="Admin Command" subtitle="Platform Operations">
      {/* Header card */}
      <div className="mb-12 border border-black p-10 dark:border-white">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="grid h-16 w-16 place-items-center bg-black dark:bg-white">
            <FiShield className="text-white dark:text-black" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">
              Operations Center
            </h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              High-level control interface for system observation.
            </p>
          </div>
        </div>
      </div>

      {/* Admin feature cards */}
      <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 md:grid-cols-3">
        {ADMIN_CARDS.map((card, i) => {
          const Icon = card.icon
          return (
            <article
              key={card.title}
              className="group bg-white p-10 transition-colors hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900"
            >
              <div className="mb-8 flex h-10 w-10 items-center justify-center border border-black dark:border-white">
                <Icon size={18} />
              </div>

              <h3 className="text-xs font-bold uppercase tracking-widest text-black dark:text-white">
                {card.title}
              </h3>
              <p className="mt-4 text-[10px] font-bold leading-relaxed tracking-widest text-neutral-400 uppercase">
                {card.desc}
              </p>

              <div className="mt-8 flex items-center gap-3">
                <div className="h-1.5 w-1.5 bg-black animate-pulse dark:bg-white" />
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-black dark:text-white">
                  {card.status}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </AppShell>
  )
}

export default AdminDashboard
