import { FiSun, FiMoon } from 'react-icons/fi'
import { useTheme } from '../context/useTheme'

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="group grid h-10 w-10 place-items-center border border-neutral-200 text-neutral-400 transition hover:border-black hover:text-black dark:border-neutral-800 dark:text-neutral-500 dark:hover:border-white dark:hover:text-white"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
    </button>
  )
}

export default ThemeToggle
