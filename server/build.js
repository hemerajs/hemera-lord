const Fastify = require('fastify')

module.exports = function build() {
  const fastify = Fastify({ logger: { level: 'debug' } })
  fastify.register(require('./lib/plugin'))
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
      // setup headers
      reply.eventStream()
      // Add connection
      reply.addClient()
      // Pass stream
      reply.send(reply.res)
      // init request
      fastify.hemera.sendKnabeReport()
    }
  })
  return fastify
}
