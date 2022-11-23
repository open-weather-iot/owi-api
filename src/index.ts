import fs from 'fs-extra'
import Swagger from 'openapi-doc'
import express from 'express'
import uriUtils from '@axway/api-builder-uri-utils'
import { WebSocketServer } from 'ws'

import BinaryBody from './middlewares/BinaryBody'
import MsgPackBody from './middlewares/MsgPackBody'

import { Init as databaseInit, Teardown as databaseTeardown } from './database'

const swagger = new Swagger()

Swagger.securityMiddleware = function securityMiddleware(swagger_, verb: string, path: string) {
  let security_handlers: ((arg: any) => any)[] = []

  if (swagger_.securityHandlers && Object.keys(swagger_.securityHandlers).length) {
    // Find the operation
    const global_security = swagger_.doc
      && swagger_.doc.security

    // Find the operation
    const operation = swagger_.doc
      && swagger_.doc.paths
      && swagger_.doc.paths[path]
      && swagger_.doc.paths[path][verb]

    if (operation && operation.security)
      security_handlers = operation.security.map((requirement) => swagger_.securityHandlers[Object.keys(requirement)[0]])

    if (!security_handlers && global_security)
      security_handlers = global_security.map((requirement) => swagger_.securityHandlers[Object.keys(requirement)[0]])
  }

  return async (req, resp, next) => {
    let authorized = false
    let custom_return = null

    if (security_handlers && security_handlers.length > 0) {
      for (let i = 0; i < security_handlers.length; ++i) {
        authorized = await security_handlers[i](req)
        custom_return = null

        if (Array.isArray(authorized)) {
          custom_return = authorized[1]
          authorized = authorized[0]
        }

        if (authorized)
          break
      }
    } else {
      authorized = true
    }

    if (!authorized)
      return resp.status(401).json(custom_return ?? { err: 'auth' })

    return next()
  }
}

const swagger_security = swagger.security.bind(swagger)
swagger.security = function security(definitions) {
  return swagger_security(definitions)//.response(401)
}

swagger.globalConsumes('application/json')
swagger.globalProduces('application/json')

import RegisterSecurityMiddlewares from './middlewares/authenticate'
import LiveController from './controllers/LiveController'
import HealthCheckController from './controllers/HealthCheckController'
import LogRequests from './middlewares/LogRequests'
import NotFoundFallback from './middlewares/NotFoundFallback'
import CatchErrors from './middlewares/CatchErrors'

export default async function bootstrap() {
  await databaseInit(swagger, {
    defaults: { id_size: 7 },
  })

  RegisterSecurityMiddlewares(swagger)
  const wss = new WebSocketServer({ noServer: true })
  LiveController(swagger, wss)
  HealthCheckController(swagger)

  const swaggerRoutes = express.Router()

  Swagger.forEachAction(swagger, (verb: string, path: string) =>
    swaggerRoutes[verb](
      // full path
      uriUtils.oasPathToExpress(path).replace(/\[|\]/g, ''),

      // handlers
      Swagger.securityMiddleware(swagger, verb, path),
      Swagger.actionMiddleware(swagger, verb, path),
    ))

  const app = express()

  app.disable('x-powered-by')

  app.use(express.json({ limit: '10mb', strict: false }))
  app.use(LogRequests())
  app.use(BinaryBody({ type: ['application/octet-stream', 'image/*', 'video/*'] }))
  app.use(MsgPackBody())
  app.use(swaggerRoutes)
  app.use(NotFoundFallback())
  app.use(CatchErrors())

  // listen if not in test
  if (process.env.NODE_ENV !== 'test') {
    const http_port = process.env.PORT ?? 8080

    const server = app.listen(http_port, () => {
      console.info(new Date().toISOString())
      console.info(`HTTP backend server listening on port ${http_port}`)
    })

    server.on('upgrade', (request, socket, head) => {
      console.log('upgrading!!', request.url)

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    })

    process.on('SIGINT', (signal) => {
      console.info(new Date().toISOString())
      console.info(`received ${signal}`)

      server.close(() => {
        console.info('HTTP backend server closed.')

        databaseTeardown().then(() => {
          console.info('database closed.')
          console.info('gracefully shutting down node...')
        })
      })
    })
  }

  return app
}
bootstrap()
