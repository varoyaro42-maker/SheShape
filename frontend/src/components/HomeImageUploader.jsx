import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { adminUploads } from '../api/admin.js'
import { readError } from '../api/client.js'
import styles from './HomeImageUploader.module.css'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 5 * 1024 * 1024

export default function HomeImageUploader({ label, value, onChange, disabled }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

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
      const { uploadUrl, url } = await adminUploads.presignHome({
        contentType: file.type,
        size: file.size
      })

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status}).`)
      }

      onChange(url)
    } catch (err) {
      setError(err.response ? readError(err) : err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>

      <div className={styles.preview}>
        {value ? (
          <>
            <img src={value} alt="" className={styles.image} />
            <button
              type="button"
              className={styles.remove}
              onClick={() => onChange('')}
              disabled={disabled || uploading}
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.placeholder}
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <ImagePlus size={22} />
            <span>{uploading ? 'Uploading…' : 'Add image'}</span>
          </button>
        )}
      </div>

      {value && (
        <button
          type="button"
          className={styles.replace}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? 'Uploading…' : 'Replace image'}
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} className={styles.input} />
    </div>
  )
}
