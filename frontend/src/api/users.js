import api from './client.js'

const unwrap = (response) => response.data.data

export const usersApi = {
  prepareAvatar: (payload) => api.post('/users/me/avatar/prepare', payload).then(unwrap),
  updateAvatar: (url) => api.patch('/users/me/avatar', { url }).then(unwrap)
}
