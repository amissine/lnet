#!/usr/bin/env node

const context  = require("../conf/context.json")
const hip      = process.argv[2]
const llp      = process.argv[3]
const hbMsg    = "heartbeat from " + hip
const readline = require("readline")
const rl       = readline.createInterface({ input: process.stdin, output: null})
const { spawn }    = require("child_process")
const util         = require("util")

// Read the heartbeat (or a command) from stdin
var rl_cb = function( line ) {
  return line.indexOf("heartbeat") == 0 || command(line)
}

// Write the heartbeat to stdout
var hbLoop = setInterval(() => { console.log(hbMsg) }, context.heartbeatRateMs)
console.log(hbMsg)

// Make SSH connection to the leaf in a new terminal (optional)
var terminal = null
if (llp) terminal = spawn("./terminal", [ "ssh", "-p", llp, "localhost" ])

// Read stdin until EOF (Ctrl-D) or Ctrl-C
rl.on("close", () => {
  llp && terminal.kill()
  console.log("\nExiting\n"); process.exit(0) 
})
const prompt  = "\n\x1b[32mEnter command to execute on the hub, or press Ctrl-D (or Ctrl-C) to exit\n>\x1b[0m"
var loop = true // FgGreen                                                                            Reset
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
  console.log("Executing '" + line + "'")
  if (line == "stop heartbeat") {
    clearInterval(hbLoop)
    return true
  } else if (line == "run eosd") {
    spawn("../test/rc/04/eosd.sh")
    return true
  }
  return false
}
