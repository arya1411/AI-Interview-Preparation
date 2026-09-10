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

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const getPasswordStrength = (password) => {
  let strength = 0
  const errors = []
  
  if (password.length >= 8) strength += 1
  else errors.push('8+ characters')
  
  if (password.length <= 128) strength += 1
  else errors.push('max 128 characters')
  
  if (/[A-Z]/.test(password)) strength += 1
  else errors.push('uppercase letter')
  
  if (/[a-z]/.test(password)) strength += 1
  else errors.push('lowercase letter')
  
  if (/[0-9]/.test(password)) strength += 1
  else errors.push('number')
  
  if (/[^A-Za-z0-9]/.test(password)) strength += 1
  else errors.push('special character')
  
  return { strength: strength / 6, errors }
}

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
  const [passwordErrors, setPasswordErrors] = useState([])
  const [passwordStrength, setPasswordStrength] = useState(0)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    
    if (name === 'password') {
      const { strength, errors } = getPasswordStrength(value)
      setPasswordStrength(strength)
      setPasswordErrors(errors)
    }
  }

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
    
    // Frontend validation
    if (form.name.length < 2) {
      notifyError('Name must be at least 2 characters')
      return
    }
    if (form.name.length > 50) {
      notifyError('Name must not exceed 50 characters')
      return
    }
    if (!validateEmail(form.email)) {
      notifyError('Please provide a valid email address')
      return
    }
    if (passwordErrors.length > 0) {
      notifyError('Password does not meet requirements')
      return
    }
    
    // Check common passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome']
    if (commonPasswords.includes(form.password.toLowerCase())) {
      notifyError('Password is too common. Please choose a stronger password.')
      return
    }
    
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


          <form onSubmit={onSubmit} className="space-y-5">
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
              {form.email && !validateEmail(form.email) && (
                <p className="mt-1 text-[9px] text-red-400">Please enter a valid email address</p>
              )}
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
              {form.password && (
                <div className="mt-2">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength < 0.33
                          ? 'bg-red-500'
                          : passwordStrength < 0.66
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${passwordStrength * 100}%` }}
                    />
                  </div>
                  {passwordErrors.length > 0 && (
                    <p className="mt-2 text-[9px] text-neutral-500 dark:text-neutral-400">
                      Missing: {passwordErrors.join(', ')}
                    </p>
                  )}
                  {passwordStrength === 1 && (
                    <p className="mt-2 text-[9px] text-green-400">Strong password</p>
                  )}
                </div>
              )}
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
              className="group mt-4 flex w-full items-center justify-between bg-black px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
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
