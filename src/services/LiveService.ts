import { nanoid } from 'nanoid'
import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { Typeorm } from '../database/typeorm'
import { LiveMeasurements } from '../database/models'

export default class Service {
  private liveMeasurementsRepository = Typeorm.getRepository(LiveMeasurements)
  private subscribers: Map<string, { ws: WebSocket, request: IncomingMessage }> = new Map()

  handleNewSubscriber(ws: WebSocket, request: IncomingMessage) {
    const connId = nanoid()
    this.subscribers.set(connId, { ws, request })

    ws.on('close', (code, reason) => {
      this.subscribers.delete(connId)
      console.log('connection closed', { code, reason: reason.toString('utf-8') })
    })
  }

  async webhookPublishMeasurement(body: any) {
    //console.log(body.end_device_ids)
    // {
    //   device_id: 'eui-70b3d57ed00546e5',
    //   application_ids: { application_id: 'lora-feec' },
    //   dev_eui: '70B3D57ED00546E5',
    //   dev_addr: '260DAB9A'
    // }

    //console.log(body.uplink_message.rx_metadata)
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

    const raw_payload = Buffer.from(body.uplink_message.frm_payload, 'base64').toString('utf8')
    const pkt_timestamp = body.uplink_message.rx_metadata[0].received_at

    return this.publishJSONMeasurement({ payload: raw_payload, timestamp: pkt_timestamp })
  }

  async publishJSONMeasurement(opts: { payload: string, timestamp: string }) {
    let payload: Pick<LiveMeasurements, 'measurements' | 'errors'>

    try {
      payload = JSON.parse(opts.payload)
    } catch (err) {
      console.log(err)
      console.log('malformed payload:', opts.payload)

      return { status: 400, data: { err: 'malformed_payload' } }
    }

    return this.publishMeasurement({ measurements: payload.measurements, errors: payload.errors, timestamp: opts.timestamp })
  }

  async publishMeasurement(opts: Pick<LiveMeasurements, 'measurements' | 'errors'> & { timestamp: string }) {
    const { measurements, errors, timestamp } = opts

    const data: Omit<LiveMeasurements, '_id'> = { measurements, errors, timestamp }
    this.subscribers.forEach(({ ws }) => ws.send(JSON.stringify(data)))
    await this.liveMeasurementsRepository.insert(data)

    return { status: 200, data: { ok: true } }
  }

  async getDataseries() {
    const data = await this.liveMeasurementsRepository.find({})

    return { status: 200, data }
  }
}
