import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const minutes = (count) => count * 60 * 1000

function readLimit(name, fallback) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

const s3Origin = () => {
  try {
    return new URL(process.env.S3_PUBLIC_URL).origin
  } catch {
    return null
  }
}

// Content Security Policy: scripts only from this site; images and media
// from this site, S3 and Unsplash; uploads go straight to S3 from the
// browser. Card payments are a full-page redirect to XentriPay, so no
// third-party frames or scripts are needed.
const contentSecurityPolicy = {
  useDefaults: true,
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.amazonaws.com'],
    'media-src': ["'self'", 'blob:', 'https://*.amazonaws.com'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", 'https://*.amazonaws.com'],
    'frame-src': ["'self'"],
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null
  }
}

const withS3 = (list) => (s3Origin() ? [...list, s3Origin()] : list)
contentSecurityPolicy.directives['img-src'] = withS3(contentSecurityPolicy.directives['img-src'])
contentSecurityPolicy.directives['connect-src'] = withS3(contentSecurityPolicy.directives['connect-src'])

const strictHeaders = helmet({
  contentSecurityPolicy,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' }
})

// The bundled app prototype is a self-contained page with inline scripts.
const prototypeHeaders = helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })

export const securityHeaders = (req, res, next) =>
  req.path === '/app-demo.html' ? prototypeHeaders(req, res, next) : strictHeaders(req, res, next)

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

// Public forms that send email: contact, newsletter signup, booking requests.
export const contactLimiter = rateLimit({
  windowMs: minutes(60),
  limit: readLimit('CONTACT_RATE_LIMIT_MAX', 5),
  ...shared
})

export const newsletterLimiter = rateLimit({
  windowMs: minutes(60),
  limit: readLimit('NEWSLETTER_RATE_LIMIT_MAX', 10),
  ...shared
})

export const bookingLimiter = rateLimit({
  windowMs: minutes(60),
  limit: readLimit('BOOKING_RATE_LIMIT_MAX', 6),
  ...shared
})

// Order placement and payment status/retry. The lookup accepts a phone number
// as proof, so it must not be guessable at speed.
export const orderLimiter = rateLimit({
  windowMs: minutes(15),
  limit: readLimit('ORDER_RATE_LIMIT_MAX', 30),
  ...shared
})

export const paymentStatusLimiter = rateLimit({
  windowMs: minutes(15),
  limit: readLimit('PAYMENT_STATUS_RATE_LIMIT_MAX', 300),
  ...shared
})
