import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { usersApi } from '../api/users.js'
import { readError } from '../api/client.js'
import { uploadFile, AVATAR_PREPARE } from '../utils/upload.js'
import styles from './AvatarUploader.module.css'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 5 * 1024 * 1024

export default function AvatarUploader({ user, onChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? '?'

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')

    if (file.size > MAX_BYTES) {
      setError(`${file.name} is larger than 5 MB.`)
      return
    }

    setUploading(true)

    try {
      const url = await uploadFile({ prepareUrl: AVATAR_PREPARE, kind: 'avatar', file })
      const updated = await usersApi.updateAvatar(url)
      onChange(updated)
    } catch (err) {
      setError(err.response ? readError(err) : err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile photo"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className={styles.image} />
        ) : (
          <span className={styles.initial}>{initial}</span>
        )}
      </button>

      <div>
        <button
          type="button"
          className={styles.change}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Camera size={15} />
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
        <p className={styles.hint}>JPEG, PNG or WebP, up to 5 MB.</p>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} className={styles.input} />
    </div>
  )
}
