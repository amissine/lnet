module.exports = rl_cb

// If the line starts with the name of a hub, pass the rest of it to the hub
function rl_cb( line, hubs ) {
  var args = line.split(' ')
  var hubname = args[0]
	var hub = hubs.find(h => { return h.name == hubname })
  if (hub != undefined) {
    hub.ssh.stdin.write(line.slice(hubname.length + 1) + "\n")
    console.log("\x1b[32m- pid " + hub.ssh.pid + ", line='" + line + "'\x1b[0m")
             //  FgGreen                                               Reset
    return true
  }
  return false
}
