export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function notFound(message) {
  return new HttpError(404, message)
}

export function badRequest(message) {
  return new HttpError(400, message)
}
