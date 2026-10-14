import api from './client.js'

const unwrap = (response) => response.data.data

export const usersApi = {
  presignAvatar: (payload) => api.post('/users/me/avatar/presign', payload).then(unwrap),
  updateAvatar: (url) => api.patch('/users/me/avatar', { url }).then(unwrap)
}
