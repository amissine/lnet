#!/usr/bin/env bash
# === install_ctl.sh ===
#
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
# Install the ctl service on a target box

# As of January 30, 2018, the test case for the ctl service looks as follows. The
# purpose of the service is to enable and to support the distribution process of all
# three layers of software (application, distribution, networking) throughout
# Cloud Trust Ltd. For example, the service itself can distribute its updated
# version throughout the cloud.
# 
# First, it would be nice to have two test scripts that add and delete a service
# along with the ctl admin user associated with the service, see
# 
#    "../07 sudo svcadd ctl_admin1.sh"
#
# and
# 
#    "../08 sudo svcdel ctl_admin1.sh"
#
# for example.
#
# cd ~/project/lnet/test/rc/05/; find . -type f 2>/dev/null | xargs grep -l "@CTLNAME@" | sed -z 's/\n/\ /g'
# ./distro/ctl/configureTargetBox.sh ./distro/ctl/configureLocalBox.sh ./distro/ctl/ctlService.sh ./distro/service/ctl 

unset CDPATH  # To prevent unexpected `cd` behavior.

CTL_ADMIN=$1
CTL_HOME=/home/$CTL_ADMIN

declare logfile="/$CTL_HOME/install_ctl.log"

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

  pushd $CTL_HOME

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

  # Check all the distros
  pushd /home
  for name in *; do
    su -c "cd /home/$name; make distro >> $logfile" - $name
  done
  popd

  # Check /etc/init.d/ctl
  if [ ! -s /etc/init.d/ctl ] || [ /etc/init.d/ctl -ot distro/service/ctl ]; then
    cp distro/service/ctl /etc/init.d
    update-rc.d ctl defaults
    log "Updated /etc/init.d/ctl - box restart required"
  fi

  popd
}

checkSudo
