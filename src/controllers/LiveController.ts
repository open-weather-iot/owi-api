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

    ws.on('close', (code, reason) => {
      subscribers.delete(connId)
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
      //console.log(request.body.end_device_ids)
      // {
      //   device_id: 'eui-70b3d57ed00546e5',
      //   application_ids: { application_id: 'lora-feec' },
      //   dev_eui: '70B3D57ED00546E5',
      //   dev_addr: '260DAB9A'
      // }

      //console.log(request.body.uplink_message.rx_metadata)
      // [
      //   {
      //     gateway_ids: { gateway_id: 'feec-unicamp', eui: 'A840411ED4004150' },
      //     time: '2022-11-23T01:51:15.489833Z',
      //     timestamp: 2250343526,
      //     rssi: -36,
      //     channel_rssi: -36,
      //     snr: 9,
      //     uplink_token: 'ChoKGAoMZmVlYy11bmljYW1wEgioQEEe1ABBUBDmiIaxCBoMCJP59ZsGEIa+lsACIPDctJe/vgE=',
      //     received_at: '2022-11-23T01:51:15.472995781Z'
      //   }
      // ]

      let measurements: LiveMeasurements['measurements']
      let errors: LiveMeasurements['errors']

      try {
        const payload = JSON.parse(Buffer.from(request.body.uplink_message.frm_payload, 'base64').toString('utf8'))
        measurements = payload.measurements
        errors = payload.errors
      } catch (err) {
        console.log(err)
        console.log('malformed payload:', request.body.uplink_message.frm_payload)

        return response.json({ err: 'malformed_payload' })
      }

      const data: Omit<LiveMeasurements, '_id'> = { measurements, errors, timestamp: request.body.uplink_message.rx_metadata[0].received_at }
      subscribers.forEach(({ ws }) => ws.send(JSON.stringify(data)))
      await Typeorm.getRepository(LiveMeasurements).insert(data)

      return response.json({ ok: true })
    })

  swagger.post('/publish')
    .security('apiTokenPublish')
    .action(async (request: Request, response: Response) => {
      const { measurements, errors } = request.body

      const data: Omit<LiveMeasurements, '_id'> = { measurements, errors, timestamp: new Date().toISOString() }
      subscribers.forEach(({ ws }) => ws.send(JSON.stringify(data)))
      await Typeorm.getRepository(LiveMeasurements).insert(data)

      return response.json({ ok: true })
    })

  swagger.get('/dataseries')
    //.security('aa')
    .action(async (request: Request, response: Response) => {
      const data = await Typeorm.getRepository(LiveMeasurements).find({})

      return response.json(data)
    })
}
