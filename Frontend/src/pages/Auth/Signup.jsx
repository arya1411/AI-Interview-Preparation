import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSquare, FiArrowRight } from 'react-icons/fi'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import { useUser } from '../../context/useUser'
import { getErrorMessage } from '../../utils/helper'
import { notifyError, notifySuccess } from '../../utils/toast'
import uploadImage from '../../utils/uploadimage'

const SignupPage = () => {
  const navigate = useNavigate()
  const { login } = useUser()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    profileImageUrl: '',
  })

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageUrl = await uploadImage(file)
      setForm((prev) => ({ ...prev, profileImageUrl: imageUrl }))
      notifySuccess('Image uploaded')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Image upload failed'))
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await axiosInstance.post(API_PATH.AUTH.REGISTER, form)
      login(data)
      notifySuccess('Account created')
      navigate('/dashboard')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Signup failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="claude-home flex min-h-screen bg-white text-black dark:bg-neutral-950 dark:text-white">
      {/* ── Left side (Branding) ── */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-neutral-200 p-12 dark:border-neutral-800 lg:flex">
        <Link to="/" className="flex w-fit items-center gap-3">
          <FiSquare size={24} strokeWidth={2.5} />
          <span className="text-sm font-bold tracking-[0.3em] uppercase">PrepAI</span>
        </Link>

        <div>
          <h2 className="text-4xl font-extrabold uppercase leading-tight tracking-tight">
            INITIATE
            <br />
            PROTOCOL.
          </h2>
          <p className="mt-6 max-w-sm text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Create a specialized preparation identity. Gain access to role-specific AI insights and session tracking.
          </p>
        </div>

        <div className="text-[10px] font-bold tracking-widest uppercase text-neutral-300 dark:text-neutral-700">
          Vers. 2026.4.9 // REGISTRATION_OPEN
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

          <h1 className="text-xs font-bold uppercase tracking-[0.2em]">Create Account</h1>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Register for the intelligent workspace.
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                User Name
              </label>
              <input
                className="input-minimal"
                placeholder="FULL NAME"
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                Email Address
              </label>
              <input
                className="input-minimal"
                placeholder="IDENTITY@PREP.AI"
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                Security Key
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

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                Avatar <span className="font-medium lowercase tracking-normal opacity-50">(optional)</span>
              </label>
              <label className="flex cursor-pointer items-center justify-center border border-dashed border-neutral-300 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition hover:border-black hover:text-black dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white">
                {form.profileImageUrl ? 'Identity Attached' : 'Select Image File'}
                <input className="hidden" type="file" accept="image/*" onChange={onPickImage} />
              </label>
            </div>

            <button
              disabled={busy}
              type="submit"
              className="group mt-4 flex w-full items-center justify-between bg-black px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {busy ? 'Registering...' : 'Create Workspace'}
              <FiArrowRight />
            </button>
          </form>

          <p className="mt-10 text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Already registered?{' '}
            <Link to="/login" className="text-black underline underline-offset-4 dark:text-white">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  )
}

export default SignupPage
