export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    if (details) this.details = details
  }
}

export const notFoundError = (message) => new HttpError(404, message)
export const badRequestError = (message) => new HttpError(400, message)
