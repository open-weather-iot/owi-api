import { Entity, ObjectIdColumn, ObjectID } from 'typeorm'
import { LiveMeasurements } from './live_measurements'

@Entity('aggregation-10m')
export class Aggregation10m {
  @ObjectIdColumn()
  _id: ObjectID
}

export function Aggregator(data: LiveMeasurements[]): Aggregation10m[] {
  return data
}
