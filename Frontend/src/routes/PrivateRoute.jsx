import { Navigate, Outlet } from 'react-router-dom'
import { useUser } from '../context/useUser'

const PrivateRoute = () => {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-6">
          <div className="h-8 w-8 animate-spin border-2 border-neutral-200 border-t-black dark:border-neutral-800 dark:border-t-white" />
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-400">
            Authorizing...
          </p>
        </div>
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export default PrivateRoute
