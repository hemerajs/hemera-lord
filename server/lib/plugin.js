'use strict'

const ConnectionPool = require('./connectionPool')
const Fp = require('fastify-plugin')

module.exports = Fp((fastify, opts, done) => {
  const pool = new ConnectionPool()
  fastify.decorate('pool', pool)
  fastify.decorateReply('addClient', function() {
    pool.add(this.res)
  })
  fastify.decorateReply('eventStream', function() {
    this.code(200)
      .type('text/event-stream;charset=UTF-8')
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-cache')
      .header('Connection', 'keep-alive')
  })
  done()
})
