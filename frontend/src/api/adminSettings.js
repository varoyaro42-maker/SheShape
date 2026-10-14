import api from './client.js'

const unwrap = (response) => response.data.data

export const adminSettings = {
  get: () => api.get('/admin/settings').then(unwrap),
  update: (payload) => api.put('/admin/settings', payload).then(unwrap)
}
