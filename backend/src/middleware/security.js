import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const minutes = (count) => count * 60 * 1000

function readLimit(name, fallback) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

// CSP and the cross-origin isolation headers are off for now: the storefront
// loads Stripe.js, S3 media and Google Fonts, and Stripe opens popups for some
// payment flows. Turn CSP on once an allowlist for those origins is written.
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
})

const shared = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
}

// Login, registration, OTP and password reset share one budget per IP.
export const authLimiter = rateLimit({
  windowMs: minutes(15),
  limit: readLimit('AUTH_RATE_LIMIT_MAX', 20),
  ...shared
})

// The public contact form is the usual spam target.
export const contactLimiter = rateLimit({
  windowMs: minutes(60),
  limit: readLimit('CONTACT_RATE_LIMIT_MAX', 5),
  ...shared
})
