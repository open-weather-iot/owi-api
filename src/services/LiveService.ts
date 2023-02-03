import { nanoid } from 'nanoid'
import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { Typeorm } from '../database/typeorm'
import { LiveMeasurements } from '../database/models'

// formato especificado nessa documentação do TTN https://www.thethingsindustries.com/docs/reference/data-formats/#uplink-messages
// apenas alguns campos são utilizados nessa API
interface TTNUplinkMessage {
  end_device_ids: {
    device_id: string
    application_ids: { application_id: string }
    dev_eui: string
    dev_addr: string
  }
  correlation_ids: string[]
  received_at: string
  uplink_message: {
    f_port: number
    f_cnt: number
    frm_payload: string
    rx_metadata: {
      gateway_ids: { gateway_id: string, eui: string }
      time: string
      timestamp: number
      rssi: number
      channel_rssi: number
      snr: number
      uplink_token: string
      received_at: string
    }[]
    settings: {
      data_rate: {
        lora: { bandwidth: number, spreading_factor: number, coding_rate: `${number}/${number}` }
      }
      frequency: `${number}`
      timestamp: number
      time: string
    }
    received_at: string
    consumed_airtime: `${number}.${number}s`
    network_ids: {
      net_id: `${number}`
      tenant_id: string
      cluster_id: string
      cluster_address: string
    }
  }
}

enum PacketType {
  NotFragmented = '0',
  Fragment = '1',
  LastFragment = '2',
}

enum PacketSize {
  Type = 1,
  Id = 10,
  Sequence = 3,
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
    const packet_type = raw_payload.substring(0, PacketSize.Type) as PacketType
    const pkt_timestamp = body.uplink_message.rx_metadata[0].received_at

    if (packet_type === PacketType.NotFragmented)
      return this.publishJSONMeasurement({ payload: raw_payload.substring(PacketSize.Type), timestamp: pkt_timestamp })

    // get each field of the fragment
    const packet_id = raw_payload.substring(PacketSize.Type, PacketSize.Type + PacketSize.Id)
    const sequence = raw_payload.substring(PacketSize.Type + PacketSize.Id, PacketSize.Type + PacketSize.Id + PacketSize.Sequence)
    const partialPayload = raw_payload.substring(PacketSize.Type + PacketSize.Id + PacketSize.Sequence)

    if (!this.fragments.has(packet_id)) {
      this.fragments.set(packet_id, { length: -1, frames: [], timestamp: '9' })
      setTimeout(() => this.fragments.delete(packet_id), 2 * 60 * 1000) // 2 minutes limit for all fragments arrive
    }

    const frag = this.fragments.get(packet_id)!

    // get number of fragments from the last fragment
    if (packet_type === PacketType.LastFragment)
      frag.length = parseInt(sequence)

    frag.frames.push({ order: parseInt(sequence), data: partialPayload })

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
