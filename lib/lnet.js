const readline     = require("readline")
const rl           = readline.createInterface({ input: process.stdin, output: process.stdout })
// color           = require("../etc/color.json")
const { spawn }    = require("child_process")
const EventEmitter = require("events").EventEmitter
const util         = require("util")

module.exports = LocalizedNetworking

util.inherits(LocalizedNetworking, EventEmitter)
function LocalizedNetworking( options ) {
  const context = options.ctx
  const rl_cb   = options.rl_cb
  const hs      = options.hs  || "~/project/lnet/bin/hub_hb.sh"
  const llp     = options.llp || 10022
  const lp      = options.lp  || 22
  const nr2hDelayMs = options.nr2hDelayMs || +60000
  const hsLog       = options.hsLog || false
  const toReconnect = options.toReconnect || +3000

  const self = this

  self.on('error', error => { util.log(error); return })

  // Schedule SSH connection attempts for all hubs
  var to = 200; context.hubs.forEach(hub => {
    console.log("Starting remote port forwarding loop for hub '" + hub + "'")
    setTimeout(() => { loop2connect2(hub).then(data => { console.log(data); return }); return }, to); to += 300
  })

  // Read stdin until EOF (Ctrl-D) or Ctrl-C
  rl.on("close", () => {
    // Kill spawned ssh processes
    self.emit("exit")
    console.log("\nExiting\n"); process.exit(0) 
  })
  const prompt      = "\n\x1b[32mEnter command to execute or press Ctrl-D (or Ctrl-C) to exit\n>\x1b[0m"
  var rl_loop = true //  FgGreen                                                                Reset
  async function loop2read_stdin() {
    while (rl_loop) {
      rl_loop = await rl_stdin()
    }
    return "loop2read_stdin: done"
  }
  function rl_stdin() {
    return new Promise(resolve => {
      rl.question(prompt, line => {
        rl_cb != null && rl_cb(line, self.hub) || console.log(`Unknown command %s${line}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
        resolve(true); return                                                                      // FgRed   Blink      Reset
      })
    })
  }
  loop2read_stdin().then(data => { console.log(data); return })

  // Loop until SSH remote port forwarding to the hub succeeds; resume looping when the connection is lost
  async function loop2connect2( hub ) {

    hub = { ip: hub, loop: true, disconnected: true }; self.hub = hub

    while (hub.loop) {
      if (hub.disconnected) { // Start the SSH process; on exit, kill the SSH process; on close, remove the killOnExit listener
        hub.ssh = spawn("ssh", [ "-R", `${llp}:127.0.0.1:${lp}`, hub.ip, hs, hub.ip, llp ])
        
        function killOnExit() { console.log("Killing ssh process " + hub.ssh.pid); hub.ssh.kill(); }
        self.on("exit", killOnExit) 
        
        hub.ssh.on('error', error => { util.log(error); return "loop2connect2("+hub.ip+"): SSH error"})
        hub.ssh.on('close', code => {
                    // Dim                                                     Reset
          console.log("\x1b[2m- pid " + hub.ssh.pid + ", exit code " + code + "\x1b[0m")
          self.removeListener("exit", killOnExit)
          return
        })
      }
      hub.disconnected = hub.disconnected ? await ssh_connect(hub) : await ssh_disconnected(hub)
    }
    return "loop2connect2("+hub.ip+"): configuration error"
  }

  // Wait until the SSH connection is lost
  function ssh_disconnected( hub ) {
    return new Promise(resolve => {
      self.once("disconnected_" + hub.ip, () => {
        util.log("ssh_disconnected: killing ssh process " + hub.ssh.pid); hub.ssh.kill()
        setTimeout(() => { resolve(true); return }, toReconnect); return
      })
    })
  }

  // Wait for SSH response
  function ssh_connect( hub ) {
    var hbtoHandle = null
    util.log("\x1b[2mssh_connect: pid " + hub.ssh.pid + ", connecting to " + hub.ip + "\x1b[0m")
          //  Dim                                                                      Reset
    function connected(resolve, line) {
      hub.disconnected && resolve(false)
      if (line.indexOf("heartbeat") == 0) {
        hbtoHandle != null && clearTimeout(hbtoHandle)
        hbtoHandle = setTimeout(() => { self.emit("disconnected_" + hub.ip); return }, context.heartbeatRateMs + 2000)
        hub.ssh.stdin.write("heartbeat from port " + llp + "\n")
      }
    }
    return new Promise(resolve => {
      hub.ssh.stdout.on('data', data => {                       // Dim        Reset
        console.log(`%s- pid ${hub.ssh.pid}, received ${data}%s`, "\x1b[2m", "\x1b[0m")
        connected(resolve, data)
      })
      hub.ssh.stderr.on('data', data => { // Dim    FgRed       Reset
        console.log(`%s${data}%s`,      "\x1b[2m\x1b[31m", "\x1b[0m")
        data.indexOf("No such file or directory") > 0 && (hub.loop = false) == false && resolve(false) == undefined
        || data.indexOf("remote port forwarding failed for listen port") > 0 && (hub.loop = false) == false && resolve(false) == undefined
        || data.indexOf("No route to host") > 0 && setTimeout(() => { resolve(true); return }, nr2hDelayMs) != null
        || resolve(true) == undefined
      })
      return
    })
  }
}
/*
 * ACKNOWLEDGMENTS
 *
 * https://thomashunter.name/blog/the-long-road-to-asyncawait-in-javascript/
 * http://blog.trackets.com/2014/05/17/ssh-tunnel-local-and-remote-port-forwarding-explained-with-examples.html
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */
