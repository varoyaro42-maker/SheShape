import api from './client.js'

const unwrap = (response) => response.data.data

export const adminDashboard = {
  overview: () => api.get('/admin/dashboard').then(unwrap)
}

export const adminSearch = {
  query: (q) => api.get('/admin/search', { params: { q } }).then(unwrap)
}

export const adminProducts = {
  list: (params) => api.get('/admin/products', { params }).then((r) => r.data),
  detail: (id) => api.get(`/admin/products/${id}`).then(unwrap),
  create: (payload) => api.post('/admin/products', payload).then(unwrap),
  update: (id, payload) => api.patch(`/admin/products/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/admin/products/${id}`),
  attachImage: (id, payload) =>
    api.post(`/admin/products/${id}/images`, typeof payload === 'string' ? { url: payload } : payload).then(unwrap),
  updateImage: (id, imageId, payload) =>
    api.patch(`/admin/products/${id}/images/${imageId}`, payload).then(unwrap),
  detachImage: (id, imageId) => api.delete(`/admin/products/${id}/images/${imageId}`),
  reorderImages: (id, ids) =>
    api.patch(`/admin/products/${id}/images/order`, { ids }).then(unwrap)
}

export const adminOrders = {
  list: (params) => api.get('/admin/orders', { params }).then((r) => r.data),
  counts: () => api.get('/admin/orders/counts').then(unwrap),
  detail: (id) => api.get(`/admin/orders/${id}`).then(unwrap),
  updateStatus: (id, status) =>
    api.patch(`/admin/orders/${id}/status`, { status }).then(unwrap)
}

export const adminPosts = {
  list: (params) => api.get('/admin/posts', { params }).then((r) => r.data),
  detail: (id) => api.get(`/admin/posts/${id}`).then(unwrap),
  create: (payload) => api.post('/admin/posts', payload).then(unwrap),
  update: (id, payload) => api.patch(`/admin/posts/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/admin/posts/${id}`)
}

export const adminPrograms = {
  list: () => api.get('/admin/programs').then(unwrap),
  detail: (id) => api.get(`/admin/programs/${id}`).then(unwrap),
  create: (payload) => api.post('/admin/programs', payload).then(unwrap),
  update: (id, payload) => api.patch(`/admin/programs/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/admin/programs/${id}`),
  attachVideo: (id, payload) => api.post(`/admin/programs/${id}/videos`, payload).then(unwrap),
  detachVideo: (id, videoId) => api.delete(`/admin/programs/${id}/videos/${videoId}`),
  reorderVideos: (id, ids) => api.patch(`/admin/programs/${id}/videos/order`, { ids }).then(unwrap)
}

export const adminCategories = {
  list: () => api.get('/admin/categories').then(unwrap),
  create: (payload) => api.post('/admin/categories', payload).then(unwrap)
}

export const adminUsers = {
  list: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  detail: (id) => api.get(`/admin/users/${id}`).then(unwrap),
  remove: (id) => api.delete(`/admin/users/${id}`)
}

export const adminHome = {
  get: () => api.get('/admin/home').then(unwrap),
  update: (payload) => api.put('/admin/home', payload).then(unwrap)
}

export const adminMessages = {
  list: (params) => api.get('/admin/messages', { params }).then((r) => r.data),
  counts: () => api.get('/admin/messages/counts').then(unwrap),
  detail: (id) => api.get(`/admin/messages/${id}`).then(unwrap),
  reply: (id, reply) => api.post(`/admin/messages/${id}/reply`, { reply }).then(unwrap)
}

// File uploads go through utils/upload.js (uploadFile).

export const adminBookings = {
  list: (params) => api.get('/admin/bookings', { params }).then((r) => r.data),
  counts: () => api.get('/admin/bookings/counts').then(unwrap),
  detail: (id) => api.get(`/admin/bookings/${id}`).then(unwrap),
  updateStatus: (id, payload) => api.patch(`/admin/bookings/${id}/status`, payload).then(unwrap)
}

export const adminSubscribers = {
  list: (params) => api.get('/admin/subscribers', { params }).then((r) => r.data),
  counts: () => api.get('/admin/subscribers/counts').then(unwrap),
  exportUrl: '/api/admin/subscribers/export.csv',
  remove: (id) => api.delete(`/admin/subscribers/${id}`)
}

export const adminAdmins = {
  list: () => api.get('/admin/admins').then(unwrap),
  invite: (payload) => api.post('/admin/admins/invites', payload).then(unwrap),
  resend: (id) => api.post(`/admin/admins/invites/${id}/resend`).then(unwrap),
  revoke: (id) => api.delete(`/admin/admins/invites/${id}`),
  remove: (id) => api.delete(`/admin/admins/${id}`)
}
