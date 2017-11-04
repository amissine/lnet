module.exports = rl_cb

function rl_cb( line, hub ) {
  hub.ssh.stdin.write(line + "\n")
  return true
}
