import { Entity, Column, ObjectIdColumn, ObjectID } from 'typeorm'

@Entity('api-token')
export class ApiToken {
  @ObjectIdColumn()
  _id: ObjectID

  @Column()
  description: string

  @Column()
  usage: string
}
