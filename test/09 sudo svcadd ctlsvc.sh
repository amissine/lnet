#!/usr/bin/env bash
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
# === 09 sudo svcadd ctlsvc.sh ===
# Add to the box the Cloud Trust Ltd service along with its sudoer ctlsvc

unset CDPATH  # To prevent unexpected `cd` behavior.

# Make sure the script is run by root
if [ "`id -u`" != "0" ]; then echo "Please try sudo -E '$BASH_SOURCE'"; exit 1; fi

declare CTLSVC # The name of the service and the sudoer the service is associated with

set_CTLSVC() { # Extract the service name from the script name
  local RESULT="${BASH_SOURCE##* }"
  CTLSVC="${RESULT%.*}"
}

sudoer_add() { # Add UNIX account for the sudoer $CTLSVC (NOPASSWD) to the box
  if [ `uname` = "Darwin" ]; then sudoer_dscl; return $?; fi

  useradd -d /home/$CTLSVC -s /bin/bash -g sudo $CTLSVC
  mkdir -p /home/$CTLSVC/.ssh
  chown -R $CTLSVC /home/$CTLSVC; chgrp -R sudo /home/$CTLSVC
  echo "$CTLSVC ALL = NOPASSWD: ALL" > /etc/sudoers.d/$CTLSVC
  chmod 700 /home/$CTLSVC/.ssh
}

sudoer_dscl() {
  echo -n "SUDO_USER=$SUDO_USER Using sudoer_dscl... "
  return 2
}

makefile_add2sudoer() { # Add Makefile to /home/$CTLSVC
  cp /home/$SUDO_USER/project/lnet/test/rc/Makefile /home/$CTLSVC
}

set_CTLSVC; echo -n "Adding sudoer $CTLSVC... "
sudoer_add && echo "Sudoer $CTLSVC added" || { ec=$?; echo "Exiting with exit code $ec"; exit $ec; }
#makefile_add2sudoer

#pushd /home/$CTLSVC
#su -c 'sudo -E make' - $CTLSVC
#popd