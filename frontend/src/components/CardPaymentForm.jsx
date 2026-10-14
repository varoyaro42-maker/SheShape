import { useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Lock, ShieldCheck } from 'lucide-react'
import { useTheme } from '../hooks/useTheme.js'
import styles from './CardPaymentForm.module.css'

const LIGHT_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#2f6b3d',
    colorBackground: '#ffffff',
    colorText: '#1c2b22',
    colorTextSecondary: '#3a4740',
    colorDanger: '#b91c1c',
    fontFamily: '"Montserrat", system-ui, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '12px',
    spacingGridRow: '16px'
  },
  rules: {
    '.Label': { fontWeight: '600', fontSize: '13px', marginBottom: '6px' },
    '.Input': { border: '1.5px solid #e7e9e0', boxShadow: 'none', padding: '12px 14px' },
    '.Input:focus': {
      border: '1.5px solid #2f6b3d',
      boxShadow: '0 0 0 3px rgba(47, 107, 61, 0.15)'
    },
    '.Tab': { border: '1.5px solid #e7e9e0', borderRadius: '12px' },
    '.Tab:hover': { border: '1.5px solid #9ec6a6' },
    '.Tab--selected': { border: '1.5px solid #2f6b3d', boxShadow: '0 0 0 1px #2f6b3d' }
  }
}

const DARK_APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#9ec6a6',
    colorBackground: '#131a2c',
    colorText: '#edf0f7',
    colorTextSecondary: '#97a2ba',
    colorDanger: '#f87171',
    fontFamily: '"Montserrat", system-ui, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '12px',
    spacingGridRow: '16px'
  },
  rules: {
    '.Label': { fontWeight: '600', fontSize: '13px', marginBottom: '6px' },
    '.Input': { border: '1.5px solid #232b42', boxShadow: 'none' },
    '.Input:focus': {
      border: '1.5px solid #9ec6a6',
      boxShadow: '0 0 0 3px rgba(158, 198, 166, 0.18)'
    },
    '.Tab': { border: '1.5px solid #232b42', borderRadius: '12px' },
    '.Tab--selected': { border: '1.5px solid #9ec6a6', boxShadow: '0 0 0 1px #9ec6a6' }
  }
}

function Inner({ onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setError('')

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required'
    })

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.')
      setSubmitting(false)
      onError?.(confirmError.message)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess()
    } else {
      setSubmitting(false)
      setError('Payment was not completed.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.head}>
        <Lock size={15} />
        Card details
      </div>

      <PaymentElement />

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={`btn ${styles.submit}`} disabled={!stripe || submitting}>
        {submitting ? (
          'Confirming payment…'
        ) : (
          <>
            <Lock size={15} />
            Pay now
          </>
        )}
      </button>

      <p className={styles.secure}>
        <ShieldCheck size={14} />
        Payments are encrypted and processed securely by Stripe. We never see or store your card
        number.
      </p>
    </form>
  )
}

export default function CardPaymentForm({ stripePromise, clientSecret, onSuccess, onError }) {
  const { theme } = useTheme()
  const appearance = theme === 'dark' ? DARK_APPEARANCE : LIGHT_APPEARANCE

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <Inner onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}
