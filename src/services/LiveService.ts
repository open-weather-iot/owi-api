import { nanoid } from 'nanoid'
import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { Typeorm } from '../database/typeorm'
import { LiveMeasurements } from '../database/models'

// formato especificado nessa documentação do TTN https://www.thethingsindustries.com/docs/reference/data-formats/#uplink-messages
// apenas alguns campos são utilizados nessa API
interface TTNUplinkMessage {
  end_device_ids: {
    device_id: string,
    application_ids: { application_id: string },
    dev_eui: string,
    dev_addr: string,
  },
  uplink_message: {
    frm_payload: string,
    rx_metadata: {
      gateway_ids: { gateway_id: string, eui: string },
      time: string,
      timestamp: number,
      rssi: number,
      channel_rssi: number,
      snr: number,
      uplink_token: string,
      received_at: string,
    }[],
  },
}

export default class Service {
  private liveMeasurementsRepository = Typeorm.getRepository(LiveMeasurements)
  private subscribers: Map<string, { ws: WebSocket, request: IncomingMessage }> = new Map()
  private fragments: Map<string, { length: number, frames: { order: number, data: string }[], timestamp: string }> = new Map()

  handleNewSubscriber(ws: WebSocket, request: IncomingMessage) {
    const connId = nanoid()
    this.subscribers.set(connId, { ws, request })

    ws.on('close', (code, reason) => {
      this.subscribers.delete(connId)
      console.log('connection closed', { code, reason: reason.toString('utf-8') })
    })
  }

  async webhookPublishMeasurement(body: TTNUplinkMessage) {
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

    if (raw_payload[0] == '0')
      return this.publishJSONMeasurement({ payload: raw_payload.substring(1), timestamp: pkt_timestamp })

    // get each field of the fragment
    // TYPE (1) + PACKET ID (10) + SEQUENCE NUMBER (3)
    const packet_id = raw_payload.substring(1, 1 + 10)
    const sequence = raw_payload.substring(1 + 10, 1 + 10 + 3)
    const payload = raw_payload.substring(1 + 10 + 3)

    if (!this.fragments.has(packet_id)) {
      this.fragments.set(packet_id, { length: -1, frames: [], timestamp: '9' })
      setTimeout(() => this.fragments.delete(packet_id), 2 * 60 * 1000) // 2 minutes limit for all fragments arrive
    }

    const frag = this.fragments.get(packet_id)!

    // get number of fragments from the packet type 2 (last fragment)
    if (raw_payload[0] == '2')
      frag.length = parseInt(sequence)

    frag.frames.push({ order: parseInt(sequence), data: payload })

    // get smallest timestamp
    if (frag.timestamp.localeCompare(pkt_timestamp) > 0)
      frag.timestamp = pkt_timestamp

    // if it has received all frames, sort them out, remove from the Map and execute publishJSONMeasurement
    if (frag.frames.length === frag.length) {
      frag.frames.sort((a, b) => a.order - b.order)
      this.fragments.delete(packet_id)

      return this.publishJSONMeasurement({ payload: frag.frames.map((f) => f.data).join(''), timestamp: frag.timestamp })
    }

    return { status: 200, data: { ok: true } }
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
