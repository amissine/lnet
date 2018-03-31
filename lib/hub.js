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
# === hub.js ===
# This code runs on the hub when a remote leaf connects.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const EventEmitter     = require("events").EventEmitter
const net              = require('net')
const fs               = require('fs')
const HeartbeatMonitor = require("./hbmonitor")
const HubIPC           = require("./hubipc")
const util             = require("util")
const readline         = require("readline")
const rl               = readline.createInterface({ input: process.stdin, output: null })
const child_process    = require("child_process")

module.exports = Hub

util.inherits(Hub, EventEmitter)
function Hub( options ) {
  const heartbeatRateMs  = options.heartbeatRateMs
  const self             = this
  const heartbeatMonitor = new HeartbeatMonitor( { remoteEnd: self, eventName: "close", timeoutMs: heartbeatRateMs * 1.5,
                                                   heartbeatRateMs: heartbeatRateMs } )
  const hip              = options.hip
  var llp, // gets set on the first heartbeat from the leaf, unique on the hub host
      hubIPC, // the hub IPC agent, bridges all the hubs on the localhost
      exitCode

  // Clean up and exit
  function cleanupAndExit( exit_code ) {
    out("Exiting " + hip + "(llp=" + llp + ") pid=" + process.pid)
    exitCode = exit_code; hubIPC.emit('close')
  }

  function debug( str ) {
    fs.appendFileSync('/tmp/debug.log', process.pid+' '+str+'\n')
  }

  var nooutput = false // set to true to stop outbound data transfer (including heartbeats)

  // Write the string to stdout (it will go to the stdin of the remote leaf)
  var out = function( str ) { 
    if (nooutput) return
    console.log(str)
    heartbeatMonitor.emit("outbound_data")
  }

  // Read the leaf data (a heartbeat, a command, or some other data) from stdin (which is the stdout of the remote leaf)
  var rl_cb = function( line ) {
    heartbeatMonitor.emit("inbound_data"); line = line.trim()
    if (line.indexOf('"heartbeat"') > 0) {       // heartbeat
      if (!llp) {
        llp = JSON.parse(line).llp; hubIPC = new HubIPC({llp: llp, hub: self})
      }
      return true
    }
    if (line == 'disconnect') {                  // command
      rl.emit('close'); return true
    }
    hubIPC.emit('broadcast', line); return true; // some other data
  }

  // Write the hub heartbeat to stdout (it will go to the stdin of the remote leaf)
  var hbMsg = function() { return JSON.stringify( { heartbeat: hip, llp: llp } ) }

  // When mocking, log the string to stderr
  var log = function( str ) {                 // FgMagenta   Reset
    options.mock && console.error(`%s${str}%s`, "\x1b[35m", "\x1b[0m")
  }

  // New connection from a remote leaf has been accepted ==========================================
  out(hbMsg()); self.on('heartbeat', () => out(hbMsg()))
  self.on('close', () => cleanupAndExit(0)) // heartbeatMonitor can emit 'close'
  self.once('hubIPC_closed', () => {
    self.removeAllListeners(); process.exit(exitCode)
  })

  // Read stdin until EOF (Ctrl-D) or Ctrl-C
  rl.on("close", () => cleanupAndExit(0))
  const prompt  = "This prompt is disabled, output: null"
  var loop = true
  loop2read_stdin().then(data => out(data))
  async function loop2read_stdin() {
    while (loop) {
      try {
        loop = await rl_stdin()
      } catch(e) {
        console.error("UNEXPECTED " + util.inspect(e))
      }
    }
    return "loop2read_stdin: done"
  }
  function rl_stdin() {
    return new Promise(resolve => {
      rl.question(prompt, line => {
        rl_cb != null && rl_cb(line) || console.log(`Unknown command %s${line}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
        resolve(true)                                                                    // FgRed   Blink      Reset
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
 */
