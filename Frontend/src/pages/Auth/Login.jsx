import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSquare, FiArrowRight } from 'react-icons/fi'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import { useUser } from '../../context/useUser'
import { getErrorMessage } from '../../utils/helper'
import { notifyError, notifySuccess } from '../../utils/toast'
import { signInWithGoogle } from '../../utils/firebase'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useUser()
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await axiosInstance.post(API_PATH.AUTH.LOGIN, form)
      login(data)
      notifySuccess('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  const onGoogleSignIn = async () => {
    setGoogleBusy(true)
    try {
      const idToken = await signInWithGoogle()
      const { data } = await axiosInstance.post(API_PATH.AUTH.GOOGLE, { idToken })
      login(data)
      notifySuccess('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Google sign-in failed'))
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <main className="claude-home flex min-h-screen bg-white text-black dark:bg-neutral-950 dark:text-white">

      <div className="hidden w-1/2 flex-col justify-between border-r border-neutral-200 p-12 dark:border-neutral-800 lg:flex">
        <Link to="/" className="flex w-fit items-center gap-3">
          <FiSquare size={24} strokeWidth={2.5} />
          <span className="text-sm font-bold tracking-[0.3em] uppercase">PrepAI</span>
        </Link>

        <div>
          <h2 className="text-4xl font-extrabold uppercase leading-tight tracking-tight">
            SYSTEM
            <br />
            ACCESS.
          </h2>
          <p className="mt-6 max-w-sm text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Secure entry to the interview preparation workspace. Performance tracking and session management enabled.
          </p>
        </div>

        <div className="text-[10px] font-bold tracking-widest uppercase text-neutral-300 dark:text-neutral-700">
          Vers. 2026.4.9 // AUTH_REQUIRED
        </div>
      </div>

      {/* ── Right side (Form) ── */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs"
        >
          <Link to="/" className="mb-12 inline-flex lg:hidden">
            <FiSquare size={24} strokeWidth={2.5} />
          </Link>

          <h1 className="text-xs font-bold uppercase tracking-[0.2em]">Sign In</h1>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Enter credentials to commence session.
          </p>

          {/* ── Google Sign In ── */}
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={googleBusy || busy}
            className="mt-8 flex w-full items-center justify-center gap-3 border border-neutral-200 px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest transition hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-900"
          >
            {googleBusy ? (
              <span className="text-[10px] tracking-widest">Connecting...</span>
            ) : (
              <>
                {/* Google G icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* ── Divider ── */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">or</span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                Identification (Email)
              </label>
              <input
                className="input-minimal"
                placeholder="USERID@PREP.AI"
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                Security Key (Password)
              </label>
              <input
                className="input-minimal"
                placeholder="••••••••"
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                required
              />
            </div>

            <button
              disabled={busy || googleBusy}
              type="submit"
              className="group flex w-full items-center justify-between bg-black px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {busy ? 'Verifying...' : 'Access Workspace'}
              <FiArrowRight />
            </button>
          </form>

          <p className="mt-10 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            No credentials?{' '}
            <Link to="/signup" className="text-black underline underline-offset-4 dark:text-white">
              Create Account
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  )
}

export default LoginPage
