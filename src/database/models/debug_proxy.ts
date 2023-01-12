import { Entity, Column, ObjectIdColumn } from 'typeorm'

@Entity('debug-proxy')
export class DebugProxy {
  @ObjectIdColumn()
  _id: string

  @Column()
  target: string
}
