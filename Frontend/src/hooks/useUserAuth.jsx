import { useUser } from '../context/useUser'

const useUserAuth = () => {
  const { user, loading } = useUser()
  return {
    isAuthenticated: Boolean(user),
    user,
    loading,
  }
}

export default useUserAuth
