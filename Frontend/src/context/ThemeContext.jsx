import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './themeContextObject'

export function ThemeProvider({ children }) {
  const [theme] = useState('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', 'dark')
  }, [theme])

  const toggleTheme = () => {}

  const value = useMemo(() => ({ theme, toggleTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
