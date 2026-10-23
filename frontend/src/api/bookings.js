import api from './client.js'

export const bookings = {
  create: (payload) => api.post('/bookings', payload).then((r) => r.data.data),
  mine: () => api.get('/bookings/my').then((r) => r.data.data)
}
