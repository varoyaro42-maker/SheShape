import { useRef, useState } from 'react'
import { ImagePlus, Clapperboard, X } from 'lucide-react'
import { readError } from '../api/client.js'
import { uploadFile, ADMIN_PREPARE, IMAGE_ACCEPT, VIDEO_ACCEPT, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, formatBytes } from '../utils/upload.js'
import styles from './HomeImageUploader.module.css'

/**
 * One-file uploader for site content. `media="video"` turns it into a video
 * picker with a progress read-out; everything else is an image.
 */
export default function HomeImageUploader({ label, value, onChange, disabled, media = 'image', hint, contain = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const isVideo = media === 'video'
  const noun = isVideo ? 'video' : 'image'
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')

    if (file.size > maxBytes) {
      setError(`${file.name} is larger than ${formatBytes(maxBytes)}.`)
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      onChange(await uploadFile({ prepareUrl: ADMIN_PREPARE, kind: isVideo ? 'video' : 'home', file, onProgress: setProgress }))
    } catch (err) {
      setError(err.response ? readError(err) : err.message)
    } finally {
      setUploading(false)
    }
  }

  const busyLabel = isVideo && uploading && progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : 'Uploading…'

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>

      <div className={`${styles.preview}${isVideo ? ` ${styles.wide}` : ''}${contain ? ` ${styles.contain}` : ''}`}>
        {value ? (
          <>
            {isVideo ? (
              <video src={value} className={styles.image} muted playsInline controls preload="metadata" />
            ) : (
              <img src={value} alt="" className={styles.image} />
            )}
            <button
              type="button"
              className={styles.remove}
              onClick={() => onChange('')}
              disabled={disabled || uploading}
              aria-label={`Remove ${noun}`}
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
            {isVideo ? <Clapperboard size={22} /> : <ImagePlus size={22} />}
            <span>{uploading ? busyLabel : `Add ${noun}`}</span>
            {uploading && isVideo && <span className={styles.bar} style={{ '--progress': progress }} />}
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
          {uploading ? busyLabel : `Replace ${noun}`}
        </button>
      )}

      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <input ref={inputRef} type="file" accept={isVideo ? VIDEO_ACCEPT : IMAGE_ACCEPT} onChange={handleFile} className={styles.input} />
    </div>
  )
}
