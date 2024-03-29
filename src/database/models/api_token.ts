import { Entity, Column, ObjectIdColumn } from 'typeorm'

@Entity('api-token')
export class ApiToken {
  @ObjectIdColumn()
  _id: string

  @Column()
  description: string

  @Column()
  usage: string

  @Column()
  rotation = 0

  @Column()
  parent?: string

  @Column()
  deleted = false
}
