'use strict'

// https://technology.amis.nl/2017/02/19/node-js-application-using-sse-server-sent-events-to-push-updates-read-from-kafka-topic-to-simple-html-client-application/

const fastify = require('fastify')({ logger: { level: 'debug' } })
const through = require('through2')
const stringify = require('json-stringify-safe')
const EOL = require('os').EOL
const connections = []

fastify.register(require('fastify-hemera'), {
  hemera: {
    logLevel: 'error'
  }
})

fastify.route({
  method: 'GET',
  url: '/events',
  schema: {
    params: {
      pattern: { type: 'string' }
    }
  },
  beforeHandler: function(request, reply, done) {
    reply
      .code(200)
      .type('text/event-stream;charset=UTF-8')
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache')
      .header('Connection', 'keep-alive')
    // Add connections
    connections.push(reply.res)
    reply.res.once('close', function() {
      var i = connections.indexOf(reply.res)
      if (i >= 0) {
        connections.splice(i, 1)
      }
      console.log('Client disconnected, now: ', connections.length)
    })
    done()
  },
  handler: (req, reply) => {
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
        connections.forEach(conn => {
          conn.write('id: ' + this.trace$.traceId + '\n')
          conn.write('event: ' + req.cmd + '\n')
          conn.write('data: ' + stringify(req.data) + '\n\n')
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
