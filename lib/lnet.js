const readline = require("readline")
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
// color = require("../etc/color.json")

module.exports = LocalizedNetworking

function LocalizedNetworking( options ) {
  const context = options.ctx

  // Schedule SSH connection attempts for all hubs
  context.hubs.forEach( (hub) => {
    console.log("Starting remote port forwarding loop for hub '" + hub + "'")
  })

  // Read stdin until EOF (Ctrl-D) or Ctrl-C
  rl.on("close", () => { console.log("\nExiting\n"); process.exit(0) })
  function loop(prompt) { rl.question(prompt, (command) => {
    console.log(`Unknown command %s${command}%s ignored`, "\x1b[31m\x1b[5m", "\x1b[0m")
    loop(prompt)})                                      // FgRed   Blink      Reset
  }; loop("\n\x1b[32mEnter command to execute or press Ctrl-D (or Ctrl-C) to exit\n>\x1b[0m ")
         //  FgGreen                                                                Reset
}

