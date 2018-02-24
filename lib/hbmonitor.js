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
# === hbmonitor.js ===
# Listen for heartbeats from the remote end. On no heartbeat, fire an event
# on the remote end.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const EventEmitter = require("events").EventEmitter
const util         = require("util")

module.exports = HeartbeatMonitor

util.inherits(HeartbeatMonitor, EventEmitter)
function HeartbeatMonitor( options ) {
	const remoteEnd = options.remoteEnd
  const eventName = options.eventName.toString()
  const timeoutMs = options.timeoutMs
  const self      = this

  self.on("heartbeat", () => {self.emit("notified", true)})
  loop2fire().then(data => { console.error(data); remoteEnd.emit(eventName) } ) // TODO: options.simulating && console.error(data)

  // Loop to fire eventName on remoteEnd when no heartbeat arrives in timeoutMs
  async function loop2fire() {
    var loop = true, timeoutNoHeartbeat = null

    while (loop) {
      timeoutNoHeartbeat != null && clearTimeout(timeoutNoHeartbeat)
      timeoutNoHeartbeat = setTimeout(() => self.emit("notified", false), timeoutMs)
      loop = await eitherEvent()
    }
    self.removeAllListeners()
    return "loop2fire returning - no heartbeat"
  }

  // Wait either for a heartbeat from the remote end or for the no heartbeat event
  function eitherEvent() {
    return new Promise(resolve => { self.once("notified", loop => { resolve(loop) }) })
  }
}