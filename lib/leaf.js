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
# === leaf.js ===
# Connect to one or more hubs.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const readline         = require("readline")
const rl               = readline.createInterface({ input: process.stdin, output: null })
const cp               = require("child_process")
const EventEmitter     = require("events").EventEmitter
const util             = require("util")
const HeartbeatMonitor = require("./hbmonitor")

module.exports = Leaf

util.inherits(Leaf, EventEmitter)
function Leaf( options ) {
  const context          = options.ctx
  const heartbeatRateMs  = context.heartbeatRateMs
  const rl_cb            = options.rl_cb
  const hs               = options.hs  || "~/project/lnet/bin/hub_hb.sh"
  const nr2hDelayMs      = options.nr2hDelayMs || +60000
  const wait2reconnect   = options.wait2reconnect || +3000
  const mock             = options.ctx.mock

  const self = this
  const start = Date.now()

  // Milliseconds since start
  function ms() {
    return "+" + (Date.now() - start) + " "
  }

  // Clean up and exit
  function cleanupAndExit( exit_code ) {
    log(ms() + "Exiting pid=" + process.pid + " exit_code=" + exit_code + "\n") 
//    self.removeAllListeners(); process.exit(exit_code)
  }

  // Log the string to stdout
  var log = function( str ) { // FgGreen     Reset
    console.log(`%s${str}%s`,   "\x1b[32m", "\x1b[0m")
  }

  // Log the string to stderr
  var err = function( str ) { // FgRed       Reset
    console.error(`%s${str}%s`, "\x1b[31m", "\x1b[0m")
  }

  self.on('error', error => console.error(error))

  // Start looping to read lines from stdin until EOF (Ctrl-D) or Ctrl-C
  rl.on("close", () => { // exit 0
    self.emit("exit") // kill spawned ssh processes, if any
    cleanupAndExit(0)
  })
  const prompt = "This prompt is disabled, output: null"
  var rl_loop = true
  async function loop2read_stdin() {
    while (rl_loop) { 
      try {
        rl_loop = await rl_stdin() 
      } catch(e) {
        console.error("UNEXPECTED " + util.inspect(e))
      }
    }
    return "loop2read_stdin: UNEXPECTED"
  }
  function rl_stdin() {
    return new Promise(resolve => {
      rl.question(prompt, line => {
        rl_cb != null && rl_cb(line, context.hubs) || console.log(`Unknown command %s${line}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
        resolve(true)                                                                                  // FgRed   Blink      Reset
      })
    })
  }
  loop2read_stdin().then(data => err(data))

  // Start looping to connect to the hubs
  context.hubs.forEach((hub) => {
    log(util.inspect(hub))
    loop2connect2(hub).then(data => err(data))
  })

  // Loop until SSH remote port forwarding to the hub succeeds; resume looping when the connection is lost
  async function loop2connect2( hub ) {
        
    function killOnExit() {
      if (hub.ssh.pid) {
        log("killOnExit: hub.ssh.pid=" + hub.ssh.pid)
        hub.ssh.stdin.write('disconnect\n'); hub.heartbeatMonitor.emit("outbound_data")
      } else {
        err("killOnExit: hub.ssh=" + hub.ssh)
      }
    }
    self.once("exit", killOnExit) // on process exit, kill the child process (if any)

    hub.loop = true; hub.disconnected = true

    var exitMsg = "UNEXPECTED error"
    while (hub.loop) {
      if (hub.disconnected) { // Start the SSH process; on close, remove the killOnExit listener
        hub.llp = +0
        hub.ssh = mock? cp.fork('lib/mock', [ hub.ip ], { silent: true })
        : cp.spawn("ssh", [ "-R", `${hub.llp}:127.0.0.1:${hub.lp}`, hub.ip, hs, hub.ip ])
        
        hub.ssh.on('error', error => { err(error); return "loop2connect2("+hub.ip+"): SSH error"})
        hub.ssh.on('close', code => {
          log(ms() + "hub.ssh.pid=" + hub.ssh.pid + " event close, code=" + code); hub.ssh=null
          self.removeListener("exit", killOnExit)
        })
      }
      try {
        hub.disconnected = hub.disconnected ? await ssh_connect(hub) : await ssh_disconnected(hub)
      } catch(e) {
        exitMsg = e; break
      }
    }
    return "loop2connect2("+hub.name+"): " + exitMsg
  }

  function noHeartbeat( ip, llp ) {
    return "no_heartbeat_" + ip + '_' + llp
  }

  // Wait until the SSH connection is lost
  function ssh_disconnected( hub ) {
    return new Promise((resolve, reject) => {
      var eventName = noHeartbeat(hub.ip, hub.llp)
      self.once(eventName, () => {
        if (hub.ssh == null) {
          reject('hub.ssh == null'); return;
        }
        console.log(ms() + eventName + " killing hub.ssh.pid=" + hub.ssh.pid); hub.ssh.kill()
        setTimeout(() => resolve(true), wait2reconnect)
      })
    })
  }

  // Wait for the first SSH response
  function ssh_connect( hub ) {
    function ondata(resolve, line) {
      hub.disconnected && resolve(false)
      if (line.heartbeat) { // received a heartbeat from hub, respond with a leaf heartbeat
        hub.ssh.stdin.write(JSON.stringify({ heartbeat: 'leaf', llp: +hub.llp }) + '\n')
        hub.heartbeatMonitor.emit("outbound_data")
      } else if (line.indexOf("Allocated port") == 0) {
        hub.llp = line.split(' ')[2]
        hub.heartbeatMonitor = new HeartbeatMonitor( { remoteEnd: self, eventName: noHeartbeat(hub.ip, hub.llp), 
          timeoutMs: heartbeatRateMs * 1.5, heartbeatRateMs: heartbeatRateMs * 1.2 } )
      } else if (line.indexOf('"data":"git ') > 0) {
        line = JSON.parse(line).data; log(ms() + "Executing '" + line + "'")
        cp.exec('echo "' + line + '" >> /tmp/ctlsvc_admin')
      }
      hub.heartbeatMonitor.emit("inbound_data")
      return true
    }
    return new Promise(resolve => { // resolve(true) means hub.disconnected
      hub.ssh.stdout.on('data', data => {
        data = data.slice(0, data.length - 1) // drop the trailing '\n'
        console.log(`%shub.ssh.pid=%s event data=%s${data}%s`, ms(), hub.ssh.pid, "\x1b[2m", "\x1b[0m")
        ondata(resolve, data.indexOf('"heartbeat"') > 0 ? JSON.parse(data) : data)
      })
      hub.ssh.stderr.on('data', data => { // Dim    FgRed       Reset
        data = data.slice(0, data.length - 1) // drop the trailing '\n'
        console.log(`%s${data}%s`,          "\x1b[2m\x1b[31m", "\x1b[0m")
        data.indexOf("No such file or directory") > 0 && (hub.loop = false) == false && resolve(false) == undefined
        || data.indexOf("remote port forwarding failed for listen port") > 0 && (hub.loop = false) == false && resolve(false) == undefined
        || data.indexOf("No route to host") > 0 && setTimeout(() => resolve(true), nr2hDelayMs) != null
        || data.indexOf("Operation timed out") > 0 && setTimeout(() => resolve(true), wait2reconnect) != null
        || data.indexOf("Allocated port") == 0 && ondata(resolve, data.toString())
        || data.indexOf("Killed by signal 15.") == 0 && resolve(true) == undefined
        || resolve(true) // == undefined && rl.close() // rl.close() means exit
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
