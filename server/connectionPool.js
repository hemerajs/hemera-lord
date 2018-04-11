'use strict'

const EOL = require('os').EOL

class ConnectionPool {
  constructor() {
    this.connections = []
  }
  add(res) {
    this.connections.push(res)
    this.setupConnection(res)
    console.log('Add new client, now: ', this.connections.length)
  }
  broadcast({ id, event, data }) {
    this.connections.forEach(conn => {
      conn.write('id: ' + id + EOL)
      conn.write('event: ' + event + EOL)
      conn.write('data: ' + JSON.stringify(data) + EOL + EOL)
    })
  }
  setupConnection(res) {
    res.once('close', () => {
      var i = this.connections.indexOf(res)
      if (i >= 0) {
        this.connections.splice(i, 1)
        console.log('Client disconnected, now: ', this.connections.length)
      }
    })
  }
}

module.exports = ConnectionPool
