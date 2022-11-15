import type { Request, Response, NextFunction } from 'express'
import typeis from 'type-is'
import { Buffer } from 'node:buffer'
import { decode as msgpackDecode } from '@msgpack/msgpack'

export default function MsgPackBody(options?: { type?: string }) {
  return (request: Request, response: Response, next: NextFunction) => {
    const type = options?.type ?? 'application/msgpack'

    // if content-type not matched
    if (!typeis(request, type))
      return next()

    // if data stream has already been consumed
    if (request.readableEnded)
      return next()

    const chunks: Buffer[] = []
    request.on('data', (data: Buffer) => chunks.push(data))
    request.on('end', () => {
      const data = Buffer.concat(chunks)
      request.body = msgpackDecode(data)

      return next()
    })
  }
}
