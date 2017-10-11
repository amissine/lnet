#!/usr/bin/env node

const context = require("../conf/context.json") //color = require("../etc/color.json")
const readline = require("readline")
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

/*
if (options.version) {
  console.log(require("../package.json").version)
  process.exit(0)
}

if (options.help) {
  console.log(function(){/*

Usage:
    tap <options> <files>

    Run the files as tap tests, parse the output, and report the results

Options:

    --stderr     Print standard error output of tests to standard error.
    --tap        Print raw tap output.
    --diag       Print diagnostic output for passed tests, as well as failed.
                 (Implies --tap)
    --gc         Expose the garbage collector to tests.
    --timeout    Maximum time to wait for a subtest, in seconds. Default: 30
    --debug      Pass the '--debug' flag to node for debugging
    --debug-brk  Pass the '--debug-brk' flag to node for debugging
    --strict     Enforce strict mode when running tests.
    --harmony    Enable harmony features for tests.
    --version    Print the version of node tap.
    --help       Print this help.

Please report bugs!  https://github.com/isaacs/node-tap/issues

*//*}.toString().split(/\n/).slice(1, -1).join("\n"))
  process.exit(0)
}
*/

// Schedule SSH connection attempts for all hubs
context.hubs.forEach( (hub) => {
  console.log("Starting remote port forwarding loop for hub '" + hub + "'")
})

// Read stdin until EOF (Ctrl-D) or Ctrl-C
rl.on("close", () => { console.log("\nExiting\n"); process.exit(0) })
function loop(prompt) { rl.question(prompt, (command) => {
  console.log(`Unknown command %s${command}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
  loop(prompt)})                                      // FgRed   Blink      Reset
}; loop("\n\x1b[32mEnter command to execute or press Ctrl-D to exit\n>\x1b[0m ")

