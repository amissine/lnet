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
  const hs      = options.hs  || "~/project/lnet/bin/hub_hb.js"
  const llp     = options.llp || 10022
  const lp      = options.lp  || 22

  const self = this

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
  function rl_loop( prompt ) { rl.question(prompt, line => {
    rl_cb != null && rl_cb(line)
    console.log(`Unknown command %s${line}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
    rl_loop(prompt)})                                // FgRed   Blink      Reset
  }; rl_loop("\n\x1b[32mEnter command to execute or press Ctrl-D (or Ctrl-C) to exit\n>\x1b[0m ")
            //  FgGreen                                                                Reset

  // Loop until SSH remote port forwarding to the hub succeeds
  async function loop2connect2( hub ) {
    var loop = true

    while (loop) {
      loop = await ssh_connect(hub)
    }
    return "loop2connect2("+hub+") returning"
  }

  // Start SSH, wait for response; on exit, kill the SSH process
  function ssh_connect( hub ) {
    const ssh = spawn("ssh", [ "-fR", `${llp}:127.0.0.1:${lp}`, hub, hs, hub ])

    console.log("\x1b[2mssh_connect: pid " + ssh.pid + ", connecting to " + hub + "\x1b[0m")
             //  Dim                                                               Reset
    function killOnExit() { console.log("Killing ssh process " + ssh.pid); ssh.kill(); }
    self.on("exit", killOnExit)
    ssh.on('close', code => {   // Dim                                    Reset
      code === 255 && console.log("\x1b[2m- pid " + ssh.pid + ", timed out\x1b[0m") == undefined
      || console.log("- pid " + ssh.pid + ", exit code " + code) // TODO remove this line
      self.removeListener("exit", killOnExit)
      return
    })
    return new Promise(resolve => {
      ssh.stdout.on('data', data => {                       // Dim        Reset
        console.log(`%s- pid ${ssh.pid}, received ${data}%s`, "\x1b[2m", "\x1b[0m")
        resolve(false)
      })
      ssh.stderr.on('data', data => { // Dim    FgRed      Reset
        console.log(`%s${data}%s`,      "\x1b[2m\x1b[31m", "\x1b[0m")
        data.indexOf("No such file or directory") > 0 && resolve(false) == undefined
        || data.indexOf("Error: remote port forwarding failed for listen port") > -1 && resolve(false) == undefined
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
