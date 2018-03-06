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
const net = require('net')
const fs  = require('fs')
const util = require('util')

module.exports = HubIPC

function HubIPC( options ) {
  const REGISTRY = process.env.HOME+"/project/lnet/etc/ipc/" // the directory where all our UNIX domain socket files reside
  const REGFILE   = 'registry.sock' // lock the registry to add/remove a hub IPC server
  const id        = options.llp // this hub's id on the localhost (local port)
  const rf = REGISTRY + REGFILE
  const self = this

  var rs, rsClient, is

  function checkRegistryOnConnect() {
    if (rs.clients.length == 1) { // registry lock is for grabs
      rs.clients[0].write("LOCK")
    }
  }

  function checkRegistryOnEnd() {
    if (rs.clients.length == 0) return; // registry is not locked
    rs.clients[0].write("LOCK")         // lock registry
  }

  function runServer(path, wrapper) {
    fs.stat(path, (err, stats) => {
      if (!err) { // file exists, remove it
        fs.unlink(path, err => {
          console.error("UNEXPECTED " + util.inspect(err)); process.exit(1)
        })
      }
    })
    return net.createServer(socket => { // on connect
      wrapper.clients.push(socket)      // add client to wrapper.clients
      wrapper.onconnect && wrapper.onconnect()
      socket.on('data', data => {
        wrapper.ondata && wrapper.ondata(socket, data.toString()) // convert buffer to string
      })
      .on('end', () => { // client disconnected
        var index = wrapper.clients.findIndex(v => { return v === socket })
        wrapper.clients.splice(index, 1) // remove client from wrapper.clients
        wrapper.onend && wrapper.onend()
      })
    })
    .listen(path)
  }

  function rsClose() {
    console.log('rs.clients.length='+rs.clients.length)
    rs.server.close()
    fs.unlink(rf, err => {
      console.error("UNEXPECTED " + util.inspect(err)); process.exit(1)
    })
    process.exit(0)
  }

  function close() { // cleanup and bid farewell to others
    acquireRegistryLock().then(() => broadcast('Bye')).then(() => remHubServer())
    .then(() => releaseRegistryLock())
  }

  function remHubServer() {
    is.server.close()
    fs.unlink(REGISTRY + id + ".sock", err => {
      console.error("UNEXPECTED " + util.inspect(err)); process.exit(1)
    })
  }

  function addHubServer() {
    is = {}; is.clients = []
    is.ondata = (socket, data) => {
      const prefix = data.slice(0, data.indexOf('.')), suffix = data.slice(data.indexOf('.') + 1)
      if (suffix == id) return; // ignore data from self
      switch (prefix) {
        case 'Hi':
        case 'Bye':
          console.log(prefix + ' from ' + suffix)
          break
        default: console.error("UNEXPECTED data='" + data + " socket=" + socket)
      }
    }
    is.server = runServer(REGISTRY + id + ".sock", is)
  }

  async function broadcast(str) {
    var w = {}
    fs.readdir(REGISTRY, (err, files) => {
      w.count = files.length - 1 // REGFILE excluded
      files.forEach(v => { if (v == REGFILE) return;
        const isClient = net.createConnection(REGISTRY + v, () => {
          isClient.write(str + '.' + id) // For example, 'Hi.12345'
          --w.count == 0 && w.resolve()
        })
      })
    })
    await new Promise(resolve => { w.resolve = resolve })
  }

  function releaseRegistryLock() {
    rsClient.end()
  }

  async function acquireRegistryLock() {
    rsClient = net.createConnection(rf)
    await new Promise(resolve => {
      rsClient.on('data', data => {
        data = data.toString(); // messages are buffers, use toString
        if (data === 'LOCK') {
          console.log('Lock acquired id='+id)
          resolve()
        }
      }).on('error', function(data) {
        console.error('Server not active.'); process.exit(1)
      })
    })
  }

  if (id == -1) {
    rs = {}; rs.clients = []; rs.onconnect = checkRegistryOnConnect
    rs.onend = checkRegistryOnEnd; rs.server = runServer(rf, rs); process.on('SIGTERM', rsClose)
    return;
  }

  // Say hi to others, start listening to othersH
  acquireRegistryLock().then(() => addHubServer()).then(() => broadcast('Hi'))
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
