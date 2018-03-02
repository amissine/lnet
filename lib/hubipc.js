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
# The hub IPC agent, bridges all hubs on the localhost.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const net = require('net')
const fs  = require('fs')

module.exports = HubIPC

function HubIPC( options ) { 
return;
  const REGISTRAR = "../etc/ipc" // the directory where all our UNIX domain sockets reside
  const id        = options.llc // this hub's id on the localhost

  // Say hi to others, start listening for others
  acquireRegistrarLock().then(id => broadcastHi(id)).then(id => addHubServer(id))
  .then(() => releaseRegistrarLock())

  // Bid farewell to others, cleanup
  function close() {
  return;
    broadcastBye(id)
    acquireRegistrarLock().then(() => cleanup())
    .then(() => releaseRegistrarLock())
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