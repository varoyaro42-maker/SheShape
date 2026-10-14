import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import routes from './routes/index.js'
import { xentripayWebhook } from './controllers/payments.controller.js'
import { notFound, errorHandler } from './middleware/error.js'
import { securityHeaders } from './middleware/security.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.join(__dirname, '../public')
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'))

const app = express()

// Passenger and Apache sit in front of the app on cPanel; trust the first hop
// so rate limiting and secure cookies see the real client.
app.set('trust proxy', 1)

app.use(securityHeaders)
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))

// The webhook needs the raw body to verify its signature, so it is mounted
// before the JSON parser.
app.post(
  '/api/payments/xentripay/webhook',
  express.raw({ type: '*/*', limit: '256kb' }),
  xentripayWebhook
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/api', routes)

if (hasClientBuild) {
  // Vite hashes everything under /assets, so those files can be cached forever.
  app.use(
    '/assets',
    express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y', index: false })
  )
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }))

  // index.html must always be revalidated or users keep an old asset manifest.
  app.get(/^(?!\/api).*/, (req, res, next) => {
    res.sendFile(
      path.join(clientDist, 'index.html'),
      { headers: { 'Cache-Control': 'no-cache' } },
      (err) => {
        if (err) next(err)
      }
    )
  })
}

app.use(notFound)
app.use(errorHandler)

export default app
