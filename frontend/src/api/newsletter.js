import api from './client.js'

export const newsletter = {
  subscribe: (payload) => api.post('/newsletter', payload).then((r) => r.data.data)
}
