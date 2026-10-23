import {
  UniqueConstraintError,
  ValidationError,
  ForeignKeyConstraintError,
  DatabaseError,
  ConnectionError
} from 'sequelize'
import { captureException } from '../utils/monitoring.js'

// mysql2 error codes that mean the client sent something the schema rejects.
const MYSQL_CODES = {
  ER_DATA_TOO_LONG: [400, 'One of the values is too long.'],
  ER_BAD_NULL_ERROR: [400, 'A required field is missing.'],
  ER_TRUNCATED_WRONG_VALUE: [400, 'One of the values in the request is malformed.'],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, 'One of the values in the request is malformed.'],
  WARN_DATA_TRUNCATED: [400, 'One of the values in the request is malformed.'],
  ER_WARN_DATA_OUT_OF_RANGE: [400, 'One of the values is outside the allowed range.']
}

const isProduction = () => process.env.NODE_ENV === 'production'

function fromSequelize(err) {
  if (err instanceof UniqueConstraintError) {
    const details = err.errors?.length
      ? err.errors.map((item) => ({
          field: item.path,
          message: `That ${item.path} is already taken.`
        }))
      : Object.keys(err.fields || {}).map((field) => ({
          field,
          message: `That ${field} is already taken.`
        }))

    return {
      status: 409,
      message: details[0]?.message || 'That value is already in use.',
      details
    }
  }

  if (err instanceof ValidationError) {
    const details = err.errors.map((item) => ({
      field: item.path,
      message: item.message
    }))

    return {
      status: 400,
      message: details.map((item) => item.message).join(' ') || 'Validation failed.',
      details
    }
  }

  if (err instanceof ForeignKeyConstraintError) {
    return {
      status: 409,
      message: 'That record is linked to something else and cannot be changed.'
    }
  }

  if (err instanceof ConnectionError) {
    return { status: 503, message: 'The database is unavailable. Try again shortly.' }
  }

  if (err instanceof DatabaseError) {
    const mapped = MYSQL_CODES[err.parent?.code]
    if (mapped) return { status: mapped[0], message: mapped[1] }
  }

  return null
}

function fromKnown(err) {
  if (err instanceof SyntaxError && 'body' in err) {
    return { status: 400, message: 'The request body is not valid JSON.' }
  }

  if (err.name === 'TokenExpiredError') {
    return { status: 401, message: 'Your session has expired. Please log in again.' }
  }

  if (err.name === 'JsonWebTokenError') {
    return { status: 401, message: 'Your session is invalid. Please log in again.' }
  }

  return null
}

function resolve(err) {
  if (err.status) {
    return { status: err.status, message: err.message, details: err.details, meta: err.meta }
  }

  return (
    fromSequelize(err) ||
    fromKnown(err) || { status: 500, message: err.message || 'Internal server error' }
  )
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
}

export function errorHandler(err, req, res, next) {
  const { status, message, details, meta } = resolve(err)

  if (status >= 500) {
    console.error(`${req.method} ${req.originalUrl}`, err)
    captureException(err, { method: req.method, url: req.originalUrl, userId: req.user?.id })
  }

  const payload = {
    error: status >= 500 && isProduction() ? 'Internal server error' : message
  }

  if (details?.length) payload.details = details
  if (meta) payload.meta = meta
  if (!isProduction()) payload.stack = err.stack

  res.status(status).json(payload)
}
