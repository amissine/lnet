#!/usr/bin/env node

const context  = require("../conf/context.json")
const hub      = process.argv[2]
const hbMsg    = "heartbeat from " + hub
const readline = require("readline")
const rl       = readline.createInterface({ input: process.stdin, output: null})

// Read the heartbeat from stdin
var rl_cb = function( line ) {
  return line.indexOf("heartbeat") == 0
}

// Write the heartbeat to stdout
setInterval(() => { console.log(hbMsg) }, context.heartbeatRateMs)
console.log(hbMsg)

// Read stdin until EOF (Ctrl-D) or Ctrl-C
rl.on("close", () => {
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
