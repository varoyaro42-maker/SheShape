import api from './client.js'

export const programs = {
  list: () => api.get('/programs').then((r) => r.data.data),
  detail: (slug) => api.get(`/programs/${slug}`).then((r) => r.data.data)
}
