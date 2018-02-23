#!/usr/bin/env node
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
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const cloud    = require("../conf/cloud.json")
const hip      = process.argv[2]
var llp        = process.argv[3]
const readline = require("readline")
const rl       = readline.createInterface({ input: process.stdin, output: null})
const child_process = require("child_process")

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
  console.log("Exiting " + hip + "(llp=" + llp + ") pid=" + process.pid); process.exit(0) 
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
    child_process.spawn("../test/rc/04/eosd.sh")
    return true
  } else if (line == 'git pull origin master') {
    child_process.exec('echo "' + line + '" >> /tmp/ctlsvc_alec'); console.log('Execution started');
    return true
  }
  return false
}
