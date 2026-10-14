import api from './client.js'

export const posts = {
  list: (params) => api.get('/posts', { params }).then((r) => r.data),
  detail: (slug) => api.get(`/posts/${slug}`).then((r) => r.data)
}
