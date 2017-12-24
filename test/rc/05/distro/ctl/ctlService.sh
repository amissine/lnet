#!/usr/bin/env bash
#
# The service waits for input on a named pipe /tmp/ctl. When it reads a line that starts with 'distro',
# it checks if $CTL_HOME/distro.tar.gz should be used as the latest distro on the box. If yes, the old
# distro is completely removed before extracting the new one from the tarball.
#
# We assume here that whenever a new tarball gets created on the source box, the source box
# copies it to the target box (the localhost) and runs $CTL_HOME/distro/ctl/configureLocalBox.sh here. It is the 
# $CTL_HOME/distro/ctl/configureLocalBox.sh script that writes a 'distro copied' line into the /tmp/ctl pipe.

#su -c 'echo "`set`" > /tmp/ctlService.log' - alec # TODO: remove this comment

unset CDPATH  # To prevent unexpected `cd` behavior.

CTL_HOME=/home/alec

declare logfile="/tmp/ctl.log"

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

checkDistro() {
  pushd $CTL_HOME

  # Check the latest tarball (see also: ./configureTargetBox.sh)
  if [ latest-distro.tar.gz -ot distro.tar.gz ]; then
    rm -rf distro 2>/dev/null
    tar -xzvf distro.tar.gz
    log "Local $CTL_HOME/distro/ updated"
    mv distro.tar.gz latest-distro.tar.gz
  else log "No new tarball"; fi

  # Check /etc/ssh/ssh_config
  if [ ! -s /etc/ssh/ssh_config ] || [ /etc/ssh/ssh_config -ot distro/service/ssh_config ]; then
    cp distro/service/ssh_config /etc/ssh
    log "Updated /etc/ssh/ssh_config"
  fi

  # Check /etc/ssh/sshd_config
  if [ ! -s /etc/ssh/sshd_config ] || [ /etc/ssh/sshd_config -ot distro/service/sshd_config ]; then
    cp distro/service/sshd_config /etc/ssh
    log "Updated /etc/ssh/sshd_config - service ssh restart required"
  fi

  # Check /etc/init.d/ctl
  if [ ! -s /etc/init.d/ctl ] || [ /etc/init.d/ctl -ot distro/service/ctl ]; then
    cp distro/service/ctl /etc/init.d
    update-rc.d ctl defaults
    log "Updated /etc/init.d/ctl - box restart required"
  fi

  popd
}

readPipe() {
  local line pipe="/tmp/ctl"
  rm $pipe > /dev/null 2>&1
  mkfifo $pipe
  chown alec $pipe

  log "Reading input lines from $pipe"
  while true; do
    if read line < $pipe; then
      log "$line"
      [[ ${line:0:6} == 'distro' ]] && { checkDistro; continue; }
      [[ ${line:0:4} == 'exit' ]] && break
    else break; fi
  done
}

readPipe &