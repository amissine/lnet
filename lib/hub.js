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
const HeartbeatMonitor = require("./hbmonitor")
const util             = require("util")
const readline         = require("readline")
const rl               = readline.createInterface({ input: process.stdin, output: null })
const child_process    = require("child_process")

module.exports = Hub

util.inherits(Hub, EventEmitter)
function Hub( options ) {
  const heartbeatRateMs  = options.heartbeatRateMs
  const self             = this
  const heartbeatMonitor = new HeartbeatMonitor( { remoteEnd: self, eventName: "close", timeoutMs: heartbeatRateMs * 1.5 } )
  const hip              = options.hip
  var   llp              = options.llp // gets set on the first heartbeat from the leaf, unique on the hub host
  var server = net.createServer() // to listen to other local hubs (connected to their remote leaves)

  // Clean up and exit
  function cleanupAndExit( exit_code ) {
    self.removeAllListeners(); server.close()
    out("Exiting " + hip + "(llp=" + llp + ") pid=" + process.pid); process.exit(exit_code) 
  }

  // Write the string to stdout (it will go to the stdin of the remote leaf)
  var out = function( str ) { // Dim        Reset
    console.log(`%s${str}%s`,   "\x1b[2m", "\x1b[0m")
  }

  // Read the leaf heartbeat (or a command) from stdin (which is the stdout of the remote leaf)
  var rl_cb = function( line ) {
    if (line.indexOf("heartbeat") == 0) {
      llp = line.toString().split(' ')[3]
      heartbeatMonitor.emit("heartbeat")
      return true
    }
    return command(line)
  }

  // When mocking, log the string to stderr
  var log = function( str ) {                 // FgMagenta   Reset
    options.mock && console.error(`%s${str}%s`, "\x1b[35m", "\x1b[0m")
  }

  // New connection from a remote leaf has been accepted ==========================================
  self.on('close', () => cleanupAndExit(0))

  // Start listening to other local hubs (connected to their remote leaves)
  //server.listen('../etc/ipc/' + )

  // Write the hub heartbeat to stdout (it will go to the stdin of the remote leaf)
  var hbMsg = function() { return "heartbeat from " + hip + ", llp=" + llp + " pid=" + process.pid}
  var hbLoop = setInterval(() => out(hbMsg()), heartbeatRateMs)
  out(hbMsg())

  // Read stdin until EOF (Ctrl-D) or Ctrl-C
  rl.on("close", () => { cleanupAndExit(0) })
  const prompt  = "This prompt is disabled, output: null"
  var loop = true
  loop2read_stdin().then(data => { console.log(data); return })
  async function loop2read_stdin() {
    while (loop) {
      loop = await rl_stdin()
    }
    return "loop2read_stdin: done"
  }
  function rl_stdin() {
    return new Promise(resolve => {
      rl.question(prompt, line => {
        rl_cb != null && rl_cb(line) || console.log(`Unknown command %s${line}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
        resolve(true); return                                                            // FgRed   Blink      Reset
      })
    })
  }

  // Execute a command
  function command( line ) {
    out("Executing \"" + line + "\"")
    if (line == "stop heartbeat") {
      clearInterval(hbLoop); out('Stopped heartbeat')
      return true
    } else if (line == "run eosd") {
      child_process.spawn("../test/rc/04/eosd.sh")
      return true
    } else if (line == 'git pull origin master') {
      child_process.exec('echo "' + line + '" >> /tmp/ctlsvc_alec'); out('Execution started');
      return true
    }
    return false
  }
}