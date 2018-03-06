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

  var connections = {}, rs, client, SHUTDOWN

  function runServer(path, wrapper) {
    fs.stat(path, (err, stats) => {
      if (!err) { // file exists, remove it
        fs.unlink(path, err => {
          console.error("UNEXPECTED " + util.inspect(err)); process.exit(1)
        })
      }
    })
    return net.createServer( socket => { // on connect
      wrapper.clients.push(socket) // add client to wrapper.clients
      socket.on('data', data => {
        data = data.toString() // convert buffer to string
        console.log('rs received data="' + data + '"')
      })
      .on('end', () => { // client disconnected
        var index = wrapper.clients.findIndex(v => { return v === socket })
        wrapper.clients.splice(index, 1) // remove client from wrapper.clients
      })
    })
    .listen(path)
  }

  function closeRS() {
    console.log('rs.clients.length='+rs.clients.length)
    rs.server.close(); process.exit(0)
  }

  if (id == -1) {
    rs = {}; rs.clients = []; rs.server = runServer(rf, rs); process.on('SIGTERM', closeRS)
    return;
  }

  // Say hi to others, start listening for others
  acquireRegistryLock().then(id => broadcast('Hi', id)).then(id => addHubServer(id))
  .then(() => releaseRegistryLock())

  // Cleanup and bid farewell to others
  function close() {
    acquireRegistryLock().then(() => remHubServer()).then(id => broadcast('Bye', id))
    .then(() => releaseRegistryLock())
  }

  async function acquireRegistryLock(){
    await registryLock()
  }

  function registryLock() {
    client = net.createConnection(rf)

    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        client.write(id)
        setTimeout(() => client.end(), 1000)
      })
      .on('data', data => {
            data = data.toString(); // messages are buffers. use toString
            if(data === 'LOCK'){
                console.log('Lock acquired.')
                resolve()
            }
            console.info('Server:', data) // generic message handler
        })
        .on('error', function(data) {
            console.error('Server not active.'); process.exit(1);
        })
    })
  }
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
