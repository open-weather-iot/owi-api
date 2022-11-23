import { Request } from 'express'
import assert from 'node:assert'
import NodeCache from 'node-cache'
import { Typeorm } from '../database/typeorm'
import { ObjectID, Repository } from 'typeorm'
import { ApiToken } from '../database/models'

export default function RegisterSecurityMiddlewares(swagger: any) {
  const apiTokenCache = new NodeCache({ stdTTL: 60 * 6, checkperiod: 60 * 3 })
  const ApiTokenRepository = Typeorm.getRepository(ApiToken)

  swagger.securityDefinition(
    'internalRequest', {
      type: 'apiKey',
      in: 'request',
      name: 'ip',
      description: 'This security definition allows the access only from localhost (`ip === ::ffff:127.0.0.1`).',
    },
    (request: Request) => request.ip === '::ffff:127.0.0.1',
  )

  swagger.securityDefinition(
    'apiTokenPublish', {
      type: 'apiKey',
      in: 'header',
      name: 'authorization',
      description: 'The user should use the access token obtained from the login endpoint.',
    },
    ApiTokenDefinition('publish', apiTokenCache, ApiTokenRepository))
}

function ApiTokenDefinition(usage: string, cache: NodeCache, repository: Repository<ApiToken>) {
  return async (request: any) => {
    // TODO: use authentication token
    return true

    const req_token = request.query?.apiToken as string
  
    if (typeof req_token !== 'string' || req_token.length !== 24) // ObjectId length
      return false
  
    if (!cache.has(req_token))
      cache.set<ApiToken | null>(req_token, await repository.findOne({ where: { _id: ObjectID.createFromHexString(req_token) } }))
  
    const cached_token = cache.get<ApiToken>(req_token)!
  
    if (!cached_token || cached_token.usage !== usage)
      return false
  
    request.api_token = cached_token
  
    return true
  }
}
