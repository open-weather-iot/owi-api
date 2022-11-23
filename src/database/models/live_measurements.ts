import { Entity, Column, ObjectIdColumn, ObjectID } from 'typeorm'

export class MeasurementsMetadata {
  @Column()
  name: string

  @Column()
  state: string
}

@Entity('live-measurements')
export class LiveMeasurements {
  @ObjectIdColumn()
  _id: ObjectID

  //@Column()
  //metadata: MeasurementsMetadata

  @Column()
  raw: any
}
