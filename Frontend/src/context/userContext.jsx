import { useEffect, useMemo, useState } from 'react'
import axiosInstance from '../utils/axiosInstance'
import { API_PATH } from '../utils/apiPath'
import { UserContext } from './userContextObject'

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    try {
      if (!localStorage.getItem('token')) {
        setUser(null)
        setLoading(false)
        return
      }
      const { data } = await axiosInstance.get(API_PATH.AUTH.GET_PROFILE)
      setUser(data)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const login = (payload) => {
    localStorage.setItem('token', payload.token)
    setUser(payload)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser: loadProfile }),
    [user, loading],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
