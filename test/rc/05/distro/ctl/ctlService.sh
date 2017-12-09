#!/usr/bin/env bash

#su -c 'echo "`set`" > /tmp/ctlService.log' - alec

unset CDPATH  # To prevent unexpected `cd` behavior.

CTL_HOME=/home/alec

declare logfile="/tmp/ctl.log"

log() {
  local timestamp=$([[ `uname` == "Darwin" ]] && gdate -Ins || date -Ins)
  echo "$timestamp $1" >> $logfile
}

checkDistro() {
  [[ ! -s $CTL_HOME/distro.tar.gz ]] && return 1 # distro tarball not found

  pushd $CTL_HOME
  if [ ! -s latest-distro.tar.gz ] || [ latest-distro.tar.gz -ot distro.tar.gz ]; then
    log "Updating local $CTL_HOME/distro/"
    rm -rf distro
    tar -xzvf distro.tar.gz
    mv distro.tar.gz latest-distro.tar.gz
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

  while true; do
    if read line < $pipe; then
      log "$line"
      [[ ${line:0:6} == 'distro' ]] && { checkDistro; continue; }
    else break; fi
  done
}

readPipe &