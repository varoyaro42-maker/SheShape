import api from './client.js'

export const contact = {
  send: (payload) => api.post('/contact', payload)
}
