import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiUser, FiMail, FiUploadCloud, FiCamera, FiSquare } from 'react-icons/fi'
import AppShell from '../components/layout/AppShell'
import { useUser } from '../context/useUser'
import uploadImage from '../utils/uploadimage'
import { notifyError, notifySuccess } from '../utils/toast'
import { getErrorMessage } from '../utils/helper'

const EditProfile = () => {
  const { user, refreshUser } = useUser()
  const [imageBusy, setImageBusy] = useState(false)

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageBusy(true)
    try {
      await uploadImage(file)
      await refreshUser()
      notifySuccess('Identity image updated')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Image upload failed'))
    } finally {
      setImageBusy(false)
    }
  }

  const initials = (user?.name || 'G').slice(0, 2).toUpperCase()

  return (
    <AppShell title="Profile Settings" subtitle="Identity Management">
      <div className="mx-auto max-w-2xl">
        <div className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          {/* Header section */}
          <div className="border-b border-neutral-100 p-8 dark:border-neutral-900">
            <div className="flex items-center gap-8">
              <div className="relative">
                <div className="grid h-24 w-24 place-items-center border border-neutral-200 bg-white text-3xl font-bold text-black dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
                  {initials}
                </div>
                <label className="absolute -bottom-2 -right-2 grid h-8 w-8 cursor-pointer place-items-center bg-black text-white dark:bg-white dark:text-black">
                  <FiCamera size={14} />
                  <input className="hidden" type="file" accept="image/*" onChange={onPickImage} />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-black dark:text-white">{user?.name}</h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Authorized User</p>
              </div>
            </div>
          </div>

          {/* Form section */}
          <div className="p-8">
            {imageBusy && (
              <div className="mb-8 flex items-center gap-3 border border-black p-4 text-[10px] font-bold uppercase tracking-widest text-black dark:border-white dark:text-white">
                <div className="h-2 w-2 animate-pulse bg-black dark:bg-white" />
                Synchronizing Identity Image...
              </div>
            )}

            <div className="space-y-8">
              <div>
                <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    className="input-minimal !cursor-default"
                    value={user?.name || ''}
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Email Identity
                </label>
                <div className="relative">
                  <input
                    className="input-minimal !cursor-default"
                    value={user?.email || ''}
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Identity Image Change
                </label>
                <label className="flex cursor-pointer items-center gap-4 border border-dashed border-neutral-200 p-6 transition hover:border-black dark:border-neutral-800 dark:hover:border-white">
                  <FiUploadCloud size={20} className="text-neutral-400" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">
                      Upload New Identity File
                    </p>
                    <p className="mt-1 text-[9px] font-medium tracking-wide text-neutral-400">PNG, JPG // MAX 5MB</p>
                  </div>
                  <input className="hidden" type="file" accept="image/*" onChange={onPickImage} />
                </label>
              </div>
            </div>

            <div className="mt-12 border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-900 dark:bg-neutral-900/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                INFO: Identity modification is partially locked. System updates pending for full field editing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default EditProfile
