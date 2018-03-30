/*
# Copyright 2017 Alec Missine (support@minetats.com) 
#                and the Arbitrage Logistics International (ALI) project
#
# The ALI Project licenses this file to you under the Apache License, version 2.0
# (the "License"); you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed
# under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
# CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#
# === hubipc.js ===
# The hub IPC agent, bridges all hubs on the localhost. Or, when {llp: -1} is
# passed, runs HubRegistryServer on the localhost.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const EventEmitter = require("events").EventEmitter
const net          = require('net')
const fs           = require('fs')
const util         = require('util')

module.exports = HubIPC

util.inherits(HubIPC, EventEmitter)
function HubIPC( options ) {
  const REGISTRY = process.env.HOME+"/ipc/" // the directory where all our UNIX domain socket files reside
  const REGFILE   = 'registry.sock' // lock the registry to add/remove a hub IPC server
  const id        = options.llp // this hub's id on the localhost (local port)
  const rf = REGISTRY + REGFILE
  const self = this

  self.once('close', close)
  self.on('broadcast', line => {
    acquireRegistryLock().then(() => broadcast(line)).then(() => releaseRegistryLock())
  })

  var rs, rsClient, is

  function debug( str ) {
    fs.appendFileSync('/tmp/debug.log', process.pid+' HubIPC.'+str+'\n')
  }

  function checkRegistryOnConnect() {
//    debug('checkRegistryOnConnect rs.clients.length='+rs.clients.length)
    if (rs.clients.length == 1) { // registry lock is for grabs
      var result = rs.clients[0].write("LOCK")
//      debug('checkRegistryOnConnect LOCK write='+result)
    }
  }

  function checkRegistryOnEnd() {
//    debug('checkRegistryOnEnd rs.clients.length='+rs.clients.length)
    if (rs.clients.length == 0) return; // registry is not locked
    var result = rs.clients[0].write("LOCK")         // lock registry
//    debug('checkRegistryOnEnd LOCK write='+result)
  }

  function runServer(path, wrapper) {
    fs.stat(path, (err, stats) => {
      if (!err) { // file exists, remove it
        fs.unlink(path, e => {
          console.error("UNEXPECTED 68 path=" + path + ", e="  + util.inspect(e))
          close()
        })
      }
    })
    return net.createServer(socket => { // on connect
      wrapper.clients.push(socket)      // add client to wrapper.clients
      wrapper.onconnect && wrapper.onconnect()
      socket.on('data', data => {
        wrapper.ondata && wrapper.ondata(socket, data.toString()) // convert buffer to string
      }).on('end', () => { // client disconnected
        var index = wrapper.clients.findIndex(v => { return v === socket })
        wrapper.clients.splice(index, 1) // remove client from wrapper.clients
        wrapper.onend && wrapper.onend()
      }).on('error', e => console.error("UNEXPECTED 74 " + util.inspect(e)))
    })
    .listen(path, () => { // on listening
      wrapper.resolve && wrapper.resolve()
    })
  }

  function rsClose() {
    console.error('rs.clients.length='+rs.clients.length)
    rs.server.close()
    fs.unlink(rf, err => {
      console.error("UNEXPECTED 83 " + util.inspect(err))
    })
    process.exit(0)
  }

  function close() { // cleanup and bid farewell to others
//    debug('close started')
    acquireRegistryLock().then(() => broadcast('Bye for now')).then(() => remHubServer())
    .then(() => releaseRegistryLock())
    .then(() => self.removeAllListeners()).then(() => options.hub.emit('hubIPC_closed'))
  }

  function remHubServer() {
//    debug('remHubServer started')
    is.server.close()
  }
/*
  function wrap( str, wObj ) {
    var jsObject, ok = true
    try {
      jsObject = JSON.parse(str)
    } catch (e) {
      ok = false
    }
    wObj.data = ok ? jsObject : str
    return wObj;
  }
*/
  async function addHubServer() {
    is = {}; is.clients = []
    is.ondata = (socket, data) => { data = data.toString()
      const port = data.slice(0, data.indexOf(' ')), str = data.slice(data.indexOf(' ') + 1).trim()
      if (port == id) return; // ignore data from self
      console.log(JSON.stringify({ llp: +port, to: +id, data: str  }))
    }
    is.server = runServer(REGISTRY + id + ".sock", is)
    try {
      await new Promise(resolve => { is.resolve = resolve })
    } catch(e) {
      console.error("UNEXPECTED 116 " + util.inspect(e))
    }
  }

  async function broadcast(str) {
//    debug('broadcast started')
    var w = {}
    fs.readdir(REGISTRY, (err, files) => {
      w.count = files.length - 2 // REGFILE and self excluded
      if (w.count == 0) { w.resolve(); return; }
      files.forEach(v => { if (v == REGFILE || v.slice(0, v.indexOf('.')) == id) return;
        try {
        const isClient = net.createConnection(REGISTRY + v, () => {
          isClient.write(id + ' ' + str) // For example, '12345 Hi there'
          --w.count == 0 && w.resolve()
        })
        } catch(e) {
          console.error("UNEXPECTED 136 " + util.inspect(e))
        }
      })
    })
    try {
      await new Promise(resolve => { w.resolve = resolve })
    } catch(e) {
      console.error("UNEXPECTED 123 " + util.inspect(e))
    }
  }

  function releaseRegistryLock() {
//    debug('releaseRegistryLock started')
    rsClient.end()
//    console.error('Lock released id='+id)
    rsClient = null
  }

  async function acquireRegistryLock() {
    var w = {}
    rsClient = net.createConnection(rf)
    rsClient.on('data', data => {
      data = data.toString(); // messages are buffers, use toString
//      debug('acquireRegistryLock data='+data)
      if (data === 'LOCK') {
//            console.error('Lock acquired id='+id)
        w.resolve()
      }
    }).on('error', e => {
      console.error('UNEXPECTED 143 ' + util.inspect(e))
    })
    try {
      await new Promise(resolve => { w.resolve = resolve })
    } catch(e) {
      console.error("UNEXPECTED 147" + util.inspect(e))
    }
  }

  if (id == -1) {
    rs = {}; rs.clients = []; rs.onconnect = checkRegistryOnConnect
    rs.onend = checkRegistryOnEnd; rs.server = runServer(rf, rs); process.on('SIGTERM', rsClose)
    return;
  }

  process.on('SIGTERM', close)

  // Say hi to others, start listening to others
  acquireRegistryLock().then(() => addHubServer()).then(() => broadcast('Hello everybody'))
  .then(() => releaseRegistryLock())
}
/*
 * ACKNOWLEDGMENTS
 *
 * http://blog.trackets.com/2014/05/17/ssh-tunnel-local-and-remote-port-forwarding-explained-with-examples.html
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 * https://gist.github.com/Xaekai/e1f711cb0ad865deafc11185641c632a
 * https://gist.github.com/martintajur/1640341
 * https://github.com/ORESoftware/live-mutex.git
 */
