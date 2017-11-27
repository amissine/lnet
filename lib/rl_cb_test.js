module.exports = rl_cb

// If the line starts with "test hub ", pass the rest of it to the hub
function rl_cb( line, hub ) {
  if (line.indexOf("test hub ") == 0) {
    hub.ssh.stdin.write(line.slice(9) + "\n")
    return true
  }
  return false
}
