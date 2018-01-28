#!/usr/bin/env bash

unset CDPATH  # To prevent unexpected `cd` behavior.

CTL_ADMIN=$1
CTL_HOME=/home/$CTL_ADMIN

declare logfile="/tmp/install_ctl.log"

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

checkSudo() {
  if [ `cat /etc/sudoers | grep '$CTL_ADMIN ' | wc -l` > 0 ]; then
    log "Found $CTL_ADMIN in /etc/sudoers"; return
  fi
  if [ `cat /etc/sudoers | grep $CTL_ADMIN$'\t' | wc -l` > 0 ]; then
    log "Found $CTL_ADMIN in /etc/sudoers"; return
  fi
  if [ `cat /etc/sudoers.d/ctl_admins | grep $CTL_ADMIN$'\t' | wc -l` > 0 ]; then
    log "Found $CTL_ADMIN in /etc/sudoers.d/ctl_admins"; return
  fi
  if [ `cat /etc/sudoers.d/ctl_admins | grep '$CTL_ADMIN ' | wc -l` > 0 ]; then
    log "Found $CTL_ADMIN in /etc/sudoers.d/ctl_admins"; return
  fi

  log "Appending $CTL_ADMIN to /etc/sudoers.d/ctl_admins"
  echo $CTL_ADMIN$'\t'"ALL = NOPASSWD: ALL" >> /etc/sudoers.d/ctl_admins
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

checkSudo