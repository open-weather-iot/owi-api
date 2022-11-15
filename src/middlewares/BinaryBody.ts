import type { Request, Response, NextFunction } from 'express'
import typeis from 'type-is'
import { Buffer } from 'node:buffer'

export default function BinaryBody(options?: { type?: string[] }) {
  return (request: Request, response: Response, next: NextFunction) => {
    const type = options?.type ?? ['application/octet-stream']

    // if content-type not matched
    if (!typeis(request, type))
      return next()

    // if data stream has already been consumed
    if (request.readableEnded)
      return next()

    const chunks: Buffer[] = []
    request.on('data', (data: Buffer) => chunks.push(data))
    request.on('end', () => {
      request.body = Buffer.concat(chunks)

      return next()
    })
  }
}
