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
const semver           = require('semver')
const EventEmitter     = require("events").EventEmitter
const util             = require("util")
const HeartbeatMonitor = require("./hbmonitor")

module.exports = Leaf

util.inherits(Leaf, EventEmitter)
function Leaf( options ) {
  const context          = options.ctx
  const heartbeatRateMs  = options.cloud.heartbeatRateMs
  const rl_cb            = options.rl_cb
  const hs               = options.hs  || "~/project/lnet/bin/hub_hb.sh"
  const nr2hDelayMs      = options.nr2hDelayMs || +60000
  const wait2reconnect   = options.wait2reconnect || +6000

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

  // Start ====================================================================
  log(`process.env.branch=${process.env.branch} process.env.gitdesc=${process.env.gitdesc}`)
  self.on('error', e => err(e))
  self.on('disconnect', () => {
    if (self.exiting && --self.count == 0) {
      self.removeAllListeners()
      log(ms() + "Exiting process.pid=" + process.pid)
      var USER = process.env.USER, config = process.argv[2]
      var command2restart = `pipe="/tmp/${USER}${options.cloud.IO_SUFFIX}.in"; rm $pipe 2>/dev/null; mkfifo $pipe; cat $pipe | gitdesc=\`git describe\` branch=${process.env.branch} bin/lnet.js "${config}" >> "/tmp/${USER}${options.cloud.IO_SUFFIX}.out" 2>&1 &`
      console.log("\n\tTO RESTART:\n\n" + command2restart)
      process.exit(0)
    }
  })

  // Start looping to read lines from stdin until EOF (Ctrl-D) or Ctrl-C
  rl.on('close', () => { 
    log(ms() + "rl.on('close'): started")
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
        rl_cb != null && rl_cb(line, context.hubs) 
          || console.log(`Unknown command %s${line}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
        resolve(true)                                         // FgRed   Blink      Reset
      })
    })
  }
  loop2read_stdin().then(data => err(data))

  function gitPull( git ) {
    var cmd = 'sudo su - ctl -c \'echo "' + git + '" >> /tmp/' + context.ctlsvc_name + '\''
    cp.exec(cmd); log(cmd)
  }

  function gitCommitLt(v1, v2) {
    var commit1 = +v1.split('-')[1], commit2 = +v2.split('-')[1], result = commit1 < commit2
    log(`${commit1} < ${commit2} == ${result}`) 
    return result;
  }

  function dispatch( data ) {
    var p, q = data
    while (q.data) {
      p = q; q = q.data
    }
    log(util.inspect(q))
    if (q.message && q.message.indexOf('git pull') == 0) {
      gitPull(q.message)
    }
    else if (q.indexOf('Hello') == 0) {
      var version = q.split(' ')[1];
      if (semver.lt(process.env.gitdesc, version) || gitCommitLt(process.env.gitdesc, version)) {
        log(`Updating ${process.env.gitdesc} to ${version}...`)
        gitPull('git pull --tags '+options.cloud.remote+' '+process.env.branch+'; IO_SUFFIX='+options.cloud.IO_SUFFIX)
      }
    }
    return true;
  }

  function onSshStdout(hub, data) {
    console.log(`%s%s${util.inspect(data)}%s`, ms(), "\x1b[2m", "\x1b[0m")
    if (typeof data == 'object') {
      if (data.heartbeat) { // respond with a leaf heartbeat
        try {
          var heartbeat = hub.isOn ? JSON.stringify({ heartbeat: +hub.llp })
            : JSON.stringify({ heartbeat: process.env.gitdesc, llp: +hub.llp }) // 1st heartbeat
          hub.isOn = true // having sent the 1st heartbeat, we consider the hub to be ON
          hub.ssh.stdin.write(`${heartbeat}\n`)
        } catch (e) {
          err(util.inspect(e)); setTimeout(() => hub.resolve(true), wait2reconnect); return;
        } finally {
          hub.heartbeatMonitor.emit("outbound_data")
        }
      } else {              // dispatch and broadcast data
        dispatch(data) && broadcast(hub, JSON.stringify(data))
      }
      return;
    } // Otherwise, it is a string:
    if (data.indexOf('xxx') == 0) {
    }
  }

  function doLines(doLine, hub, parse, data) {
    hub.heartbeatMonitor && hub.heartbeatMonitor.emit("inbound_data")
    if ( typeof data != 'string' ) data = data.toString() // Buffer
    data = data.trim()
    data.split('\n').forEach((line) => doLine(hub, parse(line)))
  }

  function addSshListeners( hub ) {
    hub.ssh.on('error', e => { hub.loop = false; hubExitMsg = e })
    hub.ssh.on('close', code => {
      hub.disconnecting = false; hub.disconnected = true;
      log(ms() + "hub.llp=" + hub.llp + " event close, code=" + code)
      if (+code != 0) {
        setTimeout(() => hub.resolve(true), wait2reconnect)
        return;
      }
      self.removeListener("exit", hub.koe)
      self.emit('disconnect')
    })
    hub.ssh.stdout.on('data', data => doLines(onSshStdout, hub, parse, data))
    hub.ssh.stderr.on('data', data => doLines(onSshStderr, hub, parse, data))
  }

  function parse( data ) { data = data.trim()
    try {
      var jso = JSON.parse(data)
      if (jso.data && typeof jso.data == 'string') jso.data = parse(jso.data)
      return jso;
    } catch (e) {
      return data;
    }
  }

  function onSshStderr(hub, data) {
    hub.heartbeatMonitor && hub.heartbeatMonitor.emit("inbound_data")
    console.log(`%s%s${util.inspect(data)}%s`, ms(), "\x1b[2m\x1b[31m", "\x1b[0m")
    if (typeof data == 'object') {
      hub.resolve(true); return;
    } // Otherwise, it is a string:
    if (data.indexOf('Allocated port') == 0) { // we have connected to remote hub,
      hub.llp = data.split(' ')[2]             // it'll send us its 1st heartbeat soon
      hub.heartbeatMonitor = new HeartbeatMonitor( { remoteEnd: self, eventName: noHeartbeat(hub),
        timeoutMs: heartbeatRateMs * 1.5, heartbeatRateMs: heartbeatRateMs } )
      hub.resolve(false); return;
    }
    setTimeout(() => hub.resolve(true), wait2reconnect)
  }

  function broadcast(hSelf, str) {
    context.hubs.forEach((hub) => { 
      if (hub === hSelf || hub.disconnecting || hub.disconnected) return;
      hub.ssh.stdin.write(str + '\n'); hub.heartbeatMonitor.emit("outbound_data")
    })
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
        log("killOnExit: hub.llp=" + hub.llp)
        hub.disconnecting = true
        hub.ssh.stdin.write('disconnect\n'); hub.heartbeatMonitor.emit("outbound_data")
      } else {
        err("killOnExit: hub.ssh=" + hub.ssh)
      }
    }
    self.once("exit", killOnExit) // on leaf exit, disconnect from the hub

    hub.loop = true; hub.disconnected = true; hub.exitMsg = "UNEXPECTED error"; hub.koe = killOnExit;
    while (hub.loop) {
      if (hub.disconnected) { // start the SSH process
        hub.llp = +0
        hub.ssh = cp.spawn("ssh", [ "-R", `${hub.llp}:127.0.0.1:${hub.lp}`, hub.ip, hs, hub.ip, process.env.branch ])
        addSshListeners(hub)  // configure the freshly spawned SSH process
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
