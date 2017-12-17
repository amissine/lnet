#!/usr/bin/env bash
#
# The service waits for input on a named pipe /tmp/ctl. When it reads a line that starts with 'distro',
# it checks if $CTL_HOME/distro.tar.gz should be used as the latest distro on the box. If yes, the old
# distro is completely removed before extracting the new one from the tarball.
#
# It is being assumed here that whenever a new tarball gets created in the source box, the source box
# copies it to the local target box and runs $CTL_HOME/distro/ctlNotify.sh here. It is the 
# $CTL_HOME/distro/ctlNotify.sh script that writes a 'distro updated' line into the /tmp/ctl pipe.

#su -c 'echo "`set`" > /tmp/ctlService.log' - alec

unset CDPATH  # To prevent unexpected `cd` behavior.

CTL_HOME=/home/alec

declare logfile="/tmp/ctl.log"

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

checkDistro() {
  [[ ! -s $CTL_HOME/distro.tar.gz ]] && return 1 # distro tarball not found

  pushd $CTL_HOME
  if [ ! -s latest-distro.tar.gz ] || [ latest-distro.tar.gz -ot distro.tar.gz ]; then
    log "Upgrading local $CTL_HOME/distro/"
    rm -rf distro
    tar -xzvf distro.tar.gz
    mv distro.tar.gz latest-distro.tar.gz

    # Check /etc/ssh/ssh_config
    if [ ! -s /etc/ssh/ssh_config ] || [ /etc/ssh/ssh_config -ot distro/service/ssh_config ]; then
      log "Updating /etc/ssh/ssh_config"
      cp distro/service/ssh_config /etc/ssh
    fi

    # Check /etc/ssh/sshd_config
    if [ ! -s /etc/ssh/sshd_config ] || [ /etc/ssh/sshd_config -ot distro/service/sshd_config ]; then
      log "Updating /etc/ssh/sshd_config"
      cp distro/service/sshd_config /etc/ssh
      service ssh restart
    fi

    # Check /etc/init.d/ctl
    if [ ! -s /etc/init.d/ctl ] || [ /etc/init.d/ctl -ot distro/service/ctl ]; then
      log "Updating /etc/init.d/ctl - restart required"
      cp distro/service/ctl /etc/init.d
      update-rc.d ctl defaults
    fi
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
    else break; fi
  done
}

readPipe &