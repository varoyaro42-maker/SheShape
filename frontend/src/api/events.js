import api from './client.js'

const unwrap = (r) => r.data.data

export const events = {
  list: () => api.get('/events').then(unwrap),
  get: (slug) => api.get(`/events/${slug}`).then(unwrap),
  register: (slug, payload) => api.post(`/events/${slug}/register`, payload).then(unwrap),
  status: (token) => api.get(`/events/registrations/${token}`).then(unwrap)
}

export const adminEvents = {
  list: () => api.get('/admin/events').then(unwrap),
  get: (id) => api.get(`/admin/events/${id}`).then(unwrap),
  create: (payload) => api.post('/admin/events', payload).then(unwrap),
  update: (id, payload) => api.put(`/admin/events/${id}`, payload).then(unwrap),
  duplicate: (id) => api.post(`/admin/events/${id}/duplicate`).then(unwrap),
  remove: (id) => api.delete(`/admin/events/${id}`),
  registrations: (id, params) => api.get(`/admin/events/${id}/registrations`, { params }).then(unwrap),
  registration: (id, regId) => api.get(`/admin/events/${id}/registrations/${regId}`).then(unwrap),
  addRegistration: (id, payload) => api.post(`/admin/events/${id}/registrations`, payload).then(unwrap),
  changeActivities: (id, regId, activityIds) => api.put(`/admin/events/${id}/registrations/${regId}/activities`, { activityIds }).then(unwrap),
  cancel: (id, regId) => api.post(`/admin/events/${id}/registrations/${regId}/cancel`).then(unwrap),
  confirm: (id, regId) => api.post(`/admin/events/${id}/registrations/${regId}/confirm`).then(unwrap),
  resendTicket: (id, regId) => api.post(`/admin/events/${id}/registrations/${regId}/resend-ticket`).then(unwrap),
  erase: (id, regId) => api.delete(`/admin/events/${id}/registrations/${regId}`),
  roster: (id) => api.get(`/admin/events/${id}/roster`).then(unwrap),
  exportUrl: (id) => `/api/admin/events/${id}/export.csv`,
  checkInLookup: (token) => api.get(`/admin/events/check-in/${token}`).then(unwrap),
  checkIn: (token) => api.post(`/admin/events/check-in/${token}`).then(unwrap)
}

export const formatEventDate = (date) =>
  new Date(`${date}T12:00:00+02:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kigali' })

export const formatMoney = (amount) => `${new Intl.NumberFormat('en-US').format(amount)} RWF`
