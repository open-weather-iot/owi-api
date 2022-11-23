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

    ws.on('message', (data) => {
      console.log('new data', data.toString('utf-8'))
    })

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
      console.log(request.body.end_device_ids)
      // {
      //   device_id: 'eui-70b3d57ed00546e5',
      //   application_ids: { application_id: 'lora-feec' },
      //   dev_eui: '70B3D57ED00546E5',
      //   dev_addr: '260DAB9A'
      // }

      console.log(request.body.uplink_message.rx_metadata)
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

      // {"val1": 245.1374, "val2": 285.6528, "val3": 213.3888, "val4": 7.896925, "val5": 149.1341, "val5": 343.6241, "val6": 247.1249, "val8": 54.2788}
      const raw_json = Buffer.from(request.body.uplink_message.frm_payload, 'base64').toString('utf8')
      let raw: any

      try {
        raw = JSON.parse(raw_json)
      } catch {
        console.log('malformed payload:', raw_json)

        return response.json({ err: 'malformed_payload' })
      }

      subscribers.forEach(({ ws }) => ws.send(raw))
      await Typeorm.getRepository(LiveMeasurements).insert({ raw })

      return response.json({ ok: true })
    })

  swagger.post('/publish')
    .security('apiTokenPublish')
    .action(async (request: Request, response: Response) => {
      const raw = request.body
      subscribers.forEach(({ ws }) => ws.send(raw))
      await Typeorm.getRepository(LiveMeasurements).insert({ raw })

      return response.json({ ok: true })
    })

  swagger.get('/dataseries')
    //.security('aa')
    .action(async (request: Request, response: Response) => {
      const data = await Typeorm.getRepository(LiveMeasurements).find({})

      return response.json(data)
    })

  swagger.get('/dataseries/old-format')
    //.security('aa')
    .action(async (request: Request, response: Response) => {
      response.setHeader('content-type', 'text/csv')
      //const data = await Typeorm.getRepository(LiveMeasurements).find({})
      const data: any[] = []
      for (let i = 0, timestamp = Date.now(); i < 10; i++, timestamp -= 1000)
        data.push({ value: Math.random(), direction: (Math.random() * 360).toFixed(0), timestamp })
      data.reverse()

      return response.send(['value', 'direction', 'timestamp'].join(',') + '\n' + data.map((e) => Object.values(e).join(',')).join('\n'))
    })
}
