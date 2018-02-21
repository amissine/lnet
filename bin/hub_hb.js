#!/usr/bin/env node

const cloud    = require("../conf/cloud.json")
const hip      = process.argv[2]
var llp        = process.argv[3]
const readline = require("readline")
const fs       = require('fs');
const rl       = readline.createInterface({ input: process.stdin, output: null})
const { spawn }    = require("child_process")

// Read the heartbeat (or a command) from stdin
var rl_cb = function( line ) {
  if (line.indexOf("heartbeat") == 0) {
    llp = line.toString().split(' ')[3]
    return true
  }
  return command(line)
}

// Write the heartbeat to stdout
var hbMsg = function() { return "heartbeat from " + hip + ", llp=" + llp + " pid=" + process.pid}
var hbLoop = setInterval(() => { console.log(hbMsg()) }, cloud.heartbeatRateMs)
console.log(hbMsg())

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

// Execute a command
function command( line ) {
  console.log("Executing '" + line + "'")
  if (line == "stop heartbeat") {
    clearInterval(hbLoop)
    return true
  } else if (line == "run eosd") {
    spawn("../test/rc/04/eosd.sh")
    return true
  } else if (line == 'git pull origin master') {
    const fw = fs.openSync('/tmp/ctlsvc_alec', 'w')
    fs.writeSync(fw, line)
    console.log('Execution started');
    return true
  }
  return false
}

/*
 ACKNOWLEDGMENTS
  http://hassansin.github.io/fun-with-unix-named-pipes
*/