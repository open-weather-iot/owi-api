import { Entity, Column, ObjectIdColumn, ObjectID } from 'typeorm'

@Entity('live-measurements')
export class LiveMeasurements {
  @ObjectIdColumn()
  _id: ObjectID

  @Column()
  measurements: Record<string, { raw: any, value: any, unit: string }>

  @Column()
  errors: string[]

  @Column()
  timestamp: string
}
