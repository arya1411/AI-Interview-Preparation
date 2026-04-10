import { motion, AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const panelVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.15 } },
}

const Modal = ({ open, title, children, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] dark:bg-black/60"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
            variants={panelVariants}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-8 py-6 dark:border-neutral-900">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-black dark:text-white">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center border border-neutral-200 text-neutral-400 transition hover:border-black hover:text-black dark:border-neutral-800 dark:hover:border-white dark:hover:text-white"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="px-8 py-8">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Modal
