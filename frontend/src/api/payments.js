import api from './client.js'

export const paymentsApi = {
  publishableKey: () => api.get('/payments/stripe-key').then((r) => r.data.data.publishableKey)
}
