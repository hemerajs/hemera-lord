'use strict'

// https://technology.amis.nl/2017/02/19/node-js-application-using-sse-server-sent-events-to-push-updates-read-from-kafka-topic-to-simple-html-client-application/

const fastify = require('./build')()

async function start() {
  await fastify.listen(3000)
  // demo purpose
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
      fastify.log.info('Message arrived')
      fastify.pool.broadcast({
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
