export class HttpError extends Error {
  constructor(status, message, details, meta) {
    super(message)
    this.status = status
    if (details) this.details = details
    // Extra machine-readable fields for the client, e.g. which activity filled.
    if (meta) this.meta = meta
  }
}

export const notFoundError = (message) => new HttpError(404, message)
export const badRequestError = (message) => new HttpError(400, message)
