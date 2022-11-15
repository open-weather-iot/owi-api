import { Request, Response } from 'express'
import { Typeorm } from '../database/typeorm'
import { LiveMeasurements } from '../database/models'
import { nanoid } from 'nanoid'
import { RequestWithLogger } from 'src/middlewares/LogRequests'
import type { WebSocket, WebSocketServer } from 'ws'
import type { IncomingMessage } from 'http'

export default function Controller(swagger, wss: WebSocketServer) {
  const subscribers: Map<string, { ws: WebSocket, request: IncomingMessage }> = new Map()

  function NewSubscriber(ws: WebSocket, request: IncomingMessage) {
    const connId = nanoid()
    subscribers.set(connId, { ws, request })

    const data: string[] = []
    for (let i = 0, timestamp = Date.now(); i < 10; i++, timestamp -= 1000)
      data.push(JSON.stringify({ value: Math.random(), timestamp }))
    data.reverse().map((e) => ws.send(e))

    const interval = setInterval(() => ws.send(JSON.stringify({ value: Math.random(), timestamp: Date.now() })), 1000)

    ws.on('message', (data) => {
      console.log('new data', data.toString('utf-8'))
    })

    ws.on('close', (code, reason) => {
      subscribers.delete(connId)
      clearInterval(interval)
      console.log('connection closed', { code, reason: reason.toString('utf-8') })
    })
  }

  wss.on('connection', (ws, request) => {
    console.log('connected!')

    //if (request.headers['api-key'] !== 'aa')
    //  return ws.close(4413, 'not authenticated')

    switch (request.url) {
      case '/subscribe':
        return NewSubscriber(ws, request)

      default:
        return ws.close(4404, 'not found')
    }
  })

  swagger.post('/webhook/publish')
    .security('apiTokenPublish')
    .action(async (request: Request, response: Response) => {
      console.log(request.method)
      console.log(request.body.end_device_ids)
      console.log(request.body.uplink_message.rx_metadata)
      console.log(request.body.uplink_message.frm_payload)
      console.log(Buffer.from(request.body.uplink_message.frm_payload, 'base64').toString('utf8'))

      return response.json({ ok: true })
    })

  swagger.post('/publish')
    .security('apiTokenPublish')
    .action(async (request: Request, response: Response) => {
      const data = JSON.stringify(request.body)
      subscribers.forEach(({ ws }) => ws.send(data))
      await Typeorm.getRepository(LiveMeasurements).insert({  })

      return response.json({ ok: true })
    })

  swagger.get('/dataseries')
    //.security('aa')
    .action(async (request: Request, response: Response) => {
      const data: any[] = []
      for (let i = 0, timestamp = Date.now(); i < 10; i++, timestamp -= 1000)
        data.push({ value: Math.random(), direction: (Math.random() * 360).toFixed(0), timestamp })
      data.reverse()

      return response.json(data)
    })

  swagger.get('/dataseries/old-format')
    //.security('aa')
    .action(async (request: Request, response: Response) => {
      response.setHeader('content-type', 'text/csv')
      const data: any[] = []
      for (let i = 0, timestamp = Date.now(); i < 10; i++, timestamp -= 1000)
        data.push({ value: Math.random(), direction: (Math.random() * 360).toFixed(0), timestamp })
      data.reverse()

      return response.send(['value', 'direction', 'timestamp'].join(',') + '\n' + data.map((e) => Object.values(e).join(',')).join('\n'))
    })
}
