import { Request } from 'express'
import assert from 'node:assert'
import NodeCache from 'node-cache'
import { Typeorm } from '../database/typeorm'
import { Repository } from 'typeorm'
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
    'apiToken', {
      type: 'apiKey',
      in: 'header',
      name: 'authorization',
      description: 'The user should use the access token obtained from the login endpoint.',
    },
    ApiTokenDefinition(null, apiTokenCache, ApiTokenRepository))

  swagger.securityDefinition(
    'apiTokensManager', {
      type: 'apiKey',
      in: 'header',
      name: 'authorization',
      description: 'The user should use the access token obtained from the login endpoint.',
    },
    ApiTokenDefinition('tokens-manager', apiTokenCache, ApiTokenRepository))

  swagger.securityDefinition(
    'apiTokenPublish', {
      type: 'apiKey',
      in: 'header',
      name: 'authorization',
      description: 'The user should use the access token obtained from the login endpoint.',
    },
    ApiTokenDefinition('publish', apiTokenCache, ApiTokenRepository))
}

function ApiTokenDefinition(usage: string | null, cache: NodeCache, repository: Repository<ApiToken>) {
  return async (request: any) => {
    const req_token = request.get('api-key') as string

    if (typeof req_token !== 'string' || req_token.length !== 21) // nanoid identifier length
      return false

    if (!cache.has(req_token))
      cache.set<ApiToken | null>(req_token, await repository.findOne({ where: { _id: req_token } }))

    const cached_token = cache.get<ApiToken>(req_token)!

    if (!cached_token || cached_token.deleted || (usage && cached_token.usage !== usage))
      return false

    request.api_token = cached_token

    return true
  }
}
