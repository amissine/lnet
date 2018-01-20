const readline     = require("readline")
const rl           = readline.createInterface({ input: process.stdin, output: null })
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
  const nr2hDelayMs = options.nr2hDelayMs || +60000
  const toReconnect = options.toReconnect || +3000

  const self = this

  self.on('error', error => console.error(error))

  // Start looping to read lines from stdin until EOF (Ctrl-D) or Ctrl-C
  var exit_code; rl.on("close", () => { // exit
    // Kill spawned ssh processes
    self.emit("exit")
    console.log("\nExiting with exit_code=" + exit_code + "\n"); process.exit(exit_code) 
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
        rl_cb != null && rl_cb(line, context.hubs) || console.log(`Unknown command %s${line}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
        resolve(true); return                                                                      // FgRed   Blink      Reset
      })
    })
  }
  loop2read_stdin().then(data => console.log(data))

  // Start looping to connect to the hubs
  context.hubs.forEach((hub) => {
    console.log(util.inspect(hub))
    loop2connect2(hub).then(data => console.log(data))
  })

  // Loop until SSH remote port forwarding to the hub succeeds; resume looping when the connection is lost
  async function loop2connect2( hub ) {

    hub.loop = true; hub.disconnected = true; hub.llpRequested = hub.llp

    while (hub.loop) {
      exit_code = 0
      if (hub.disconnected) { // Start the SSH process; on exit, kill the SSH process; on close, remove the killOnExit listener
        if (hub.llpRequested != hub.llp) hub.llp = hub.llpRequested
        hub.ssh = spawn("ssh", [ "-R", `${hub.llp}:127.0.0.1:${hub.lp}`, hub.ip, hs, hub.ip, hub.llp ])
        
        function killOnExit() { console.log("killOnExit: hub.ssh.pid=" + hub.ssh.pid); hub.ssh.kill(); }
        self.on("exit", killOnExit) 
        
        hub.ssh.on('error', error => { util.log(error); return "loop2connect2("+hub.ip+"): SSH error"})
        hub.ssh.on('close', code => {
          exit_code = code
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
        console.log("ssh_disconnected: killing ssh process " + hub.ssh.pid); hub.ssh.kill()
        setTimeout(() => resolve(true), toReconnect); return
      })
    })
  }

  // Wait for SSH response
  function ssh_connect( hub ) {
    var hbtoHandle = null
    console.log("\x1b[32mssh_connect: pid " + hub.ssh.pid + ", connecting to " + hub.ip + "\x1b[0m")
             //  FgGreen                                                                   Reset
    function connected(resolve, line) {
      hub.disconnected && resolve(false)
      if (line.indexOf("heartbeat") == 0) {
        hbtoHandle != null && clearTimeout(hbtoHandle)
        hbtoHandle = setTimeout(() => { self.emit("disconnected_" + hub.ip); return }, context.heartbeatRateMs + 2000)
        hub.ssh.stdin.write("heartbeat from port " + hub.llp + "\n")
      } else if (line.indexOf("Allocated port") == 0) {
        hub.llp = line.split(' ')[2]
        return true
      }
    }
    return new Promise(resolve => { // resolve(true) means hub.disconnected
      hub.ssh.stdout.on('data', data => {                       // Dim        Reset
        console.log(`%s- pid ${hub.ssh.pid}, received ${data}%s`, "\x1b[2m", "\x1b[0m")
        connected(resolve, data)
      })
      hub.ssh.stderr.on('data', data => { // Dim    FgRed       Reset
        console.log(`%s${data}%s`,          "\x1b[2m\x1b[31m", "\x1b[0m")
        data.indexOf("No such file or directory") > 0 && (hub.loop = false) == false && resolve(false) == undefined
        || data.indexOf("remote port forwarding failed for listen port") > 0 && (hub.loop = false) == false && resolve(false) == undefined
        || data.indexOf("No route to host") > 0 && setTimeout(() => resolve(true), nr2hDelayMs) != null
        || data.indexOf("Operation timed out") > 0 && setTimeout(() => resolve(true), toReconnect) != null
        || data.indexOf("Allocated port") == 0 && connected(resolve, data.toString())
        || data.indexOf("Killed by signal 15.") == 0 && resolve(true) == undefined
        || resolve(true) == undefined && rl.close() // rl.close() means exit
      })
      return
    })
  }
}
/*
 * ACKNOWLEDGMENTS
 *
 * http://blog.trackets.com/2014/05/17/ssh-tunnel-local-and-remote-port-forwarding-explained-with-examples.html
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 */
