import { useRef, useState } from 'react'
import { adminUploads } from '../api/admin.js'
import { readError } from '../api/client.js'
import styles from './VideoUploader.module.css'

const ACCEPT = 'video/mp4,video/quicktime,video/webm'
const MAX_BYTES = 1024 * 1024 * 1024

export default function VideoUploader({ videos, onAdd, onRemove, disabled }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const [title, setTitle] = useState('')

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')

    if (file.size > MAX_BYTES) {
      setError(`${file.name} is larger than 1 GB.`)
      return
    }

    setUploading(true)

    try {
      const { uploadUrl, url } = await adminUploads.presignVideo({
        contentType: file.type,
        size: file.size
      })

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })

      if (!response.ok) {
        throw new Error(`Upload failed for ${file.name} (${response.status}).`)
      }

      await onAdd({ url, title: title.trim() || file.name })
      setTitle('')
    } catch (err) {
      setError(err.response ? readError(err) : err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(video) {
    setError('')
    setRemovingId(video.id)

    try {
      await onRemove(video)
    } catch (err) {
      setError(readError(err))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {videos.map((video) => (
          <li key={video.id} className={styles.row}>
            <video src={video.url} controls className={styles.preview} />
            <span className={styles.title}>{video.title}</span>
            <button
              type="button"
              disabled={disabled || removingId === video.id}
              onClick={() => handleRemove(video)}
              className={styles.remove}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.addRow}>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Video title (optional)"
          maxLength={160}
          disabled={disabled || uploading}
          className={styles.titleInput}
        />

        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={styles.add}
        >
          {uploading ? 'Uploading…' : 'Add video'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFile}
        className={styles.input}
      />

      <p className={styles.hint}>MP4, MOV or WebM, up to 1 GB. Large files may take a while to upload.</p>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
