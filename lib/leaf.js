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

  const self = this; self.count = +0
  const start = Date.now()

  // Milliseconds since start
  function ms() {
    return "+" + (Date.now() - start) + " "
  }

  // Log the string to stdout
  var log = function( str ) { // FgGreen     Reset
    console.log(`%s${str}%s`,   "\x1b[32m", "\x1b[0m")
  }

  // Log the string to stderr
  var err = function( str ) { // FgRed       Reset
    console.error(`%s${str}%s`, "\x1b[31m", "\x1b[0m")
  }

  self.on('error', e => err(e))
  self.on('disconnect', () => {
    if (self.exiting && --self.count == 0) {
      self.removeAllListeners()
      log(ms() + "Exiting pid=" + process.pid + "\n")
      process.exit(0)
    }
  })

  // Start looping to read lines from stdin until EOF (Ctrl-D) or Ctrl-C
  rl.on("close", () => { 
    self.exiting = true; self.emit("exit") // kill spawned ssh processes, if any
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

  function onSshStdout(hub, jsObject) {
    hub.heartbeatMonitor.emit("inbound_data")
    console.log(`%s%s${util.inspect(jsObject)}%s`, ms(), "\x1b[2m", "\x1b[0m")
    if (typeof jsObject.data == 'object') {
      if (jsObject.data.heartbeat) { // respond with a leaf heartbeat
        try {
          hub.ssh.stdin.write(JSON.stringify({ heartbeat: 'leaf', llp: +hub.llp }) + '\n')
        } catch (e) {
          err(util.inspect(e)); setTimeout(() => hub.resolve(true), wait2reconnect); return;
        }
        hub.heartbeatMonitor.emit("outbound_data")
      } else if (jsObject.data.data.indexOf('git ') == 0) { var git = jsObject.data.data // execute git command
        log(ms() + "Executing '" + git + "'")
        cp.exec('sudo su - ctl -c \'echo "' + git + '" >> /tmp/' + context.CTLSVC_NAME + '\'') 
      }
      return;
    } // Otherwise, it is a string:
    if (jsObject.data.indexOf('xxx') == 0) {
    }
  }

  function addSshListeners( hub ) {
    hub.ssh.on('error', e => { hub.loop = false; hubExitMsg = e })
    hub.ssh.on('close', code => { 
      log(ms() + "hub.llp=" + hub.llp + " event close, code=" + code)
      if (+code != 0) {
        setTimeout(() => hub.resolve(true), wait2reconnect)
        return;
      }
      self.removeListener("exit", hub.koe)
      self.emit('disconnect')
    })
    hub.ssh.stdout.on('data', data => onSshStdout(hub, wrap(data, { /* hub_llp: +hub.llp */ })))
    hub.ssh.stderr.on('data', data => onSshStderr(hub, wrap(data, {})))
  }

  function onSshStderr(hub, jsObject) {
    hub.heartbeatMonitor && hub.heartbeatMonitor.emit("inbound_data")
    console.log(`%s%s${util.inspect(jsObject)}%s`, ms(), "\x1b[2m\x1b[31m", "\x1b[0m")
    if (typeof jsObject.data == 'object') {
      hub.resolve(true); return;
    } // Otherwise, it is a string:
    if (jsObject.data.indexOf('Allocated port') == 0) { // connected to remote hub
      hub.llp = jsObject.data.split(' ')[2]
      hub.heartbeatMonitor = new HeartbeatMonitor( { remoteEnd: self, eventName: noHeartbeat(hub),
        timeoutMs: heartbeatRateMs * 1.5, heartbeatRateMs: heartbeatRateMs } )
      hub.resolve(false); return;
    }
    setTimeout(() => hub.resolve(true), wait2reconnect)
  }

  function wrap( data, wObj ) {
    var str = data.toString().trim().slice(0, data.length - 1), // drop the trailing '\n'
      jsObject, ok = true
    try {
      jsObject = JSON.parse(str)
    } catch (e) {
      ok = false
    }
    /* wObj.time = Date.now(); */ wObj.data = ok ? jsObject : str
    return wObj;
  }

  // Start looping to connect to the hubs
  context.hubs.forEach((hub) => {
    log(util.inspect(hub))
    loop2connect2(hub).then(data => err(data))
  })

  // Loop until SSH remote port forwarding to the hub succeeds; resume looping when the connection is lost
  async function loop2connect2( hub ) {
        
    function killOnExit() { // hub listener, disconnects nicely when the leaf exits
      if (hub.ssh.pid) {
        log("killOnExit: hub.ssh.pid=" + hub.ssh.pid)
        hub.ssh.stdin.write('disconnect\n'); hub.heartbeatMonitor.emit("outbound_data")
      } else {
        err("killOnExit: hub.ssh=" + hub.ssh)
      }
    }
    self.once("exit", killOnExit) // on leaf exit, disconnect from the hub

    hub.loop = true; hub.disconnected = true; hub.exitMsg = "UNEXPECTED error"; hub.koe = killOnExit;
    while (hub.loop) {
      if (hub.disconnected) { // Start the SSH process
        hub.llp = +0
        hub.ssh = mock? cp.fork('lib/mock', [ hub.ip ], { silent: true })
        : cp.spawn("ssh", [ "-R", `${hub.llp}:127.0.0.1:${hub.lp}`, hub.ip, hs, hub.ip, hub.ctlsvc_name ])
        addSshListeners(hub) // configure the freshly spawned SSH process
      }
      try {
        hub.disconnected = hub.disconnected ? await ssh_connect(hub) : await ssh_disconnected(hub)
      } catch(e) {
        hub.exitMsg = e; break
      }
    }
    return "loop2connect2("+hub.name+"): " + hub.exitMsg
  }

  function noHeartbeat( hub ) { 
    return "no_heartbeat_" + hub.name + '_' + hub.llp;
  }

  // Wait until the SSH connection is lost
  function ssh_disconnected( hub ) {
    self.count++
    self.once(noHeartbeat(hub), () => {
      if (hub.ssh == null) {
        hub.reject('hub.ssh == null'); return;
      }
      console.log(ms() + noHeartbeat(hub) + " killing hub.ssh.pid=" + hub.ssh.pid)
      hub.ssh.kill(); self.count--
      setTimeout(() => hub.resolve(true), wait2reconnect)
    })
    return new Promise((resolve, reject) => { hub.resolve = resolve; hub.reject = reject })
  }

  // Wait for the first SSH response
  function ssh_connect( hub ) {
    return new Promise(resolve => { hub.resolve = resolve })
  }
}
/*
 * ACKNOWLEDGMENTS
 *
 * http://blog.trackets.com/2014/05/17/ssh-tunnel-local-and-remote-port-forwarding-explained-with-examples.html
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 * https://gist.github.com/Xaekai/e1f711cb0ad865deafc11185641c632a
 */
