'use strict'

// https://technology.amis.nl/2017/02/19/node-js-application-using-sse-server-sent-events-to-push-updates-read-from-kafka-topic-to-simple-html-client-application/

const fastify = require('fastify')({ logger: { level: 'debug' } })
const ConnectionPool = require('./connectionPool')
const pool = new ConnectionPool()

fastify.register(require('fastify-hemera'), {
  plugins: [require('hemera-knabe')],
  hemera: {
    logLevel: 'error',
    name: 'lord'
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
    fastify.hemera.sendKnabeReport()
  }
})

async function start() {
  await fastify.listen(3000)
  fastify.hemera.add(
    {
      topic: 'math',
      cmd: 'add'
    },
    req => Promise.resolve(req.a + req.b)
  )
  fastify.hemera.add(
    {
      topic: 'math',
      cmd: 'sub'
    },
    req => Promise.resolve(req.a - req.b)
  )
  fastify.hemera.add(
    {
      topic: 'knabe'
    },
    function(req) {
      console.log('Message arrived')
      pool.broadcast({
        id: this.trace$.traceId,
        event: 'service',
        data: req
      })
    }
  )
}

start()
  .then(() => {
    console.log(
      `server listening on http://${fastify.server.address().address}:${
        fastify.server.address().port
      }`
    )
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
