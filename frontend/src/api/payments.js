import api from './client.js'

export const paymentsApi = {
  methods: () => api.get('/payments/methods').then((r) => r.data.data),
  status: (orderNumber, phone) =>
    api.get(`/payments/orders/${orderNumber}`, { params: phone ? { phone } : undefined }).then((r) => r.data.data),
  retry: (orderNumber, phone) =>
    api.post(`/payments/orders/${orderNumber}/retry`, phone ? { phone } : {}).then((r) => r.data.data)
}
