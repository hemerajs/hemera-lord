'use strict'

// https://technology.amis.nl/2017/02/19/node-js-application-using-sse-server-sent-events-to-push-updates-read-from-kafka-topic-to-simple-html-client-application/

const fastify = require('fastify')({ logger: { level: 'debug' } })
const ConnectionPool = require('./connectionPool')
const pool = new ConnectionPool()

fastify.register(require('fastify-hemera'), {
  hemera: {
    logLevel: 'error'
  }
})

fastify.route({
  method: 'GET',
  url: '/events',
  handler: (req, reply) => {
    reply
      .code(200)
      .type('text/event-stream;charset=UTF-8')
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache')
      .header('Connection', 'keep-alive')
    // Add connection
    pool.add(reply.res)
    reply.send(reply.res)
  }
})
async function start() {
  await fastify.listen(3000)
}

start()
  .then(() => {
    console.log(
      `server listening on http://${fastify.server.address().address}:${
        fastify.server.address().port
      }`
    )

    fastify.hemera.add(
      {
        topic: 'hemera-lord',
        cmd: 'service:registered'
      },
      function(req) {
        console.log('Message arrived')
        pool.broadcast({
          id: this.trace$.traceId,
          event: req.cmd,
          data: JSON.stringify(req.data)
        })
      }
    )

    setInterval(() => {
      fastify.hemera.act({
        topic: 'hemera-lord',
        cmd: 'service:registered',
        pubsub$: true,
        data: { test: true }
      })
    }, 3000)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
