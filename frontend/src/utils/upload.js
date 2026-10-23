import api from '../api/client.js'

/**
 * Sends a file wherever the server says: a direct PUT to S3, or a multipart
 * POST to this server's own uploads folder. Reports progress 0..1.
 */
export async function uploadFile({ prepareUrl, kind, file, onProgress }) {
  const prep = await api.post(prepareUrl, { kind, contentType: file.type, size: file.size })
  const { method, uploadUrl, url } = prep.data.data

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, uploadUrl)
    if (method === 'POST') xhr.withCredentials = true
    if (method === 'PUT') xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total)
    }
    xhr.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'))
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Upload failed (${xhr.status}).`
        try {
          message = JSON.parse(xhr.responseText).error || message
        } catch {
          // not JSON
        }
        return reject(new Error(message))
      }
      if (method === 'POST') {
        try {
          return resolve(JSON.parse(xhr.responseText).data.url)
        } catch {
          return reject(new Error('The server did not return a file address.'))
        }
      }
      resolve(url)
    }

    if (method === 'POST') {
      const body = new FormData()
      body.append('file', file, file.name)
      xhr.send(body)
    } else {
      xhr.send(file)
    }
  })

  onProgress?.(1)
  return result
}

export const ADMIN_PREPARE = '/admin/uploads/prepare'
export const AVATAR_PREPARE = '/users/me/avatar/prepare'

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024

export const formatBytes = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(bytes > 50 * 1024 * 1024 ? 0 : 1)} MB` : `${Math.round(bytes / 1024)} KB`
