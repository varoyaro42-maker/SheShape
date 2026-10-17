import { useRef, useState } from 'react'
import { readError } from '../api/client.js'
import { uploadFile, ADMIN_PREPARE } from '../utils/upload.js'
import styles from './ImageUploader.module.css'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 5 * 1024 * 1024

export default function ImageUploader({ images, onAdd, onRemove, onColorChange, max = 40, disabled }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState(null)

  const full = images.length >= max

  async function uploadOne(file) {
    if (file.size > MAX_BYTES) {
      throw new Error(`${file.name} is larger than 5 MB.`)
    }

    return uploadFile({ prepareUrl: ADMIN_PREPARE, kind: 'product', file })
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, max - images.length))
    event.target.value = ''

    if (!files.length) return

    setError('')
    setUploading(true)

    try {
      // Upload every selected file at the same time, then attach them to
      // the product one by one (fast DB writes) so gallery order stays predictable.
      const results = await Promise.allSettled(files.map(uploadOne))
      const failures = []

      for (const result of results) {
        if (result.status === 'fulfilled') {
          await onAdd(result.value)
        } else {
          failures.push(result.reason?.response ? readError(result.reason) : result.reason?.message)
        }
      }

      if (failures.length) {
        setError(failures.filter(Boolean).join(' '))
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(image) {
    setError('')
    setRemovingId(image.id)

    try {
      await onRemove(image)
    } catch (err) {
      setError(readError(err))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {images.map((image, index) => (
          <figure key={image.id} className={styles.tile}>
            <div className={styles.imageWrap}>
              <img src={image.url} alt="" className={styles.image} />
              {index === 0 && <span className={styles.cover}>Cover</span>}
            </div>

            <input
              type="text"
              value={image.color ?? ''}
              placeholder="Color (e.g. Black)"
              maxLength={40}
              disabled={disabled}
              onChange={(event) => onColorChange?.(image, { color: event.target.value })}
              className={styles.colorInput}
            />

            <button
              type="button"
              disabled={disabled || removingId === image.id}
              onClick={() => handleRemove(image)}
              className={styles.remove}
            >
              Remove
            </button>
          </figure>
        ))}

        {!full && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className={styles.add}
          >
            {uploading ? 'Uploading…' : 'Add images'}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handleFiles}
        className={styles.input}
      />

      <p className={styles.hint}>
        JPEG, PNG or WebP, up to 5 MB each. Select several files at once to upload them together.
        The first image is the one shown in the shop. Tag images with a color (e.g. "Black", "Red")
        to group them into swatches on the product page.
      </p>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
