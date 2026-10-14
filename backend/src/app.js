import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import routes from './routes/index.js'
import { stripeWebhook } from './controllers/payments.controller.js'
import { notFound, errorHandler } from './middleware/error.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.join(__dirname, '../public')
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'))

const app = express()

app.use(morgan('dev'))
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))

app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/api', routes)

if (hasClientBuild) {
  app.use(express.static(clientDist))
  app.get(/^(?!\/api).*/, (req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.use(notFound)
app.use(errorHandler)

export default app
