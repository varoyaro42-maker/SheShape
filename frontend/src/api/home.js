import api from './client.js'

export const homeContent = {
  get: () => api.get('/home-content').then((r) => r.data.data)
}
